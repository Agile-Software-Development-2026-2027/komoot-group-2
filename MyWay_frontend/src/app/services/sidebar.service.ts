import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { ElevationStats, computeElevationStats } from '../utils/route-stats';
import { ElevationService } from './elevation.service';
import { GpxService, GpxTrack, GpxWaypoint } from './gpx.service';
import { LatLon, PlannedRoute, RoutePlannerService } from './route-planner.service';

/**
 * Width of the map covered by the open sidebar, plus some margin. From sidebar.css: the panel is
 * --sidebar-width (340px) wide and starts 12px inside the map (--sidebar-inset 28px minus the 16px
 * padding of .content). Used to keep fitted tracks out from under the panel.
 */
export const SIDEBAR_MAP_OVERLAP_PX = 400;

/** Fewer elevations than this in a GPX file are not enough for stats: the terrain model is used instead. */
const MIN_FILE_ELEVATIONS = 2;

/** The route whose stats are shown in the sidebar */
export type SidebarRoute =
  | { kind: 'gpx'; track: GpxTrack; waypoints: GpxWaypoint[] }
  | { kind: 'planned'; route: PlannedRoute };

/** Where the elevation stats come from: the GPX file itself or the Open-Meteo terrain model */
export type ElevationSource = 'gpx' | 'open-meteo';

export type ElevationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; stats: ElevationStats; source: ElevationSource }
  | { status: 'unavailable' };

type ElevationCacheKey = GpxTrack | PlannedRoute;

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private readonly elevationService = inject(ElevationService);
  private readonly routePlanner = inject(RoutePlannerService);
  private readonly gpxService = inject(GpxService);

  readonly isOpen = signal(false);
  readonly selectedRoute = signal<SidebarRoute | null>(null);
  readonly elevation = signal<ElevationState>({ status: 'idle' });
  readonly trackColorUpdate = signal<{ track: GpxTrack; color: string } | null>(null);

  private elevationRequest?: Subscription;
  /** Elevation already looked up per track/route, so selecting it again does not call the API again */
  private readonly elevationCache = new WeakMap<ElevationCacheKey, ElevationStats>();

  constructor() {
    // Show the stats of a newly created route, and drop them once that route is cleared
    effect(() => {
      const route = this.routePlanner.route();
      untracked(() => {
        if (route) {
          this.showPlannedRoute(route);
        } else if (this.selectedRoute()?.kind === 'planned') {
          this.clearSelection();
        }
      });
    });

    // Loading another GPX file removes the previous tracks from the map
    this.gpxService.currentGpx$.pipe(takeUntilDestroyed()).subscribe((gpx) => {
      const selected = this.selectedRoute();
      if (selected?.kind === 'gpx' && !gpx?.tracks.includes(selected.track)) {
        this.clearSelection();
      }
    });
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** Opens the sidebar on the stats of a GPX track; the file's waypoints provide the photos */
  showTrack(track: GpxTrack, waypoints: GpxWaypoint[] = []): void {
    this.select({ kind: 'gpx', track, waypoints });

    const fileStats = this.fileElevationStats(track);
    if (fileStats) {
      this.elevation.set({ status: 'ready', stats: fileStats, source: 'gpx' });
    } else {
      const path = track.segments.flatMap((seg) => seg.points.map(([lat, lon]) => ({ lat, lon })));
      this.loadElevation(track, path);
    }
  }

  /** Opens the sidebar on the stats of a route created with the route planner */
  showPlannedRoute(route: PlannedRoute): void {
    this.select({ kind: 'planned', route });
    this.loadElevation(route, route.points);
  }
  updateGpxTrack(track: GpxTrack): void {
    this.trackColorUpdate.set({ track, color: track.color || '#10b981' });
    const current = this.selectedRoute();
    if (current?.kind === 'gpx' && current.track === track) {
      this.selectedRoute.set({ kind: 'gpx', track, waypoints: current.waypoints });
    }
  }

  clearSelection(): void {
    this.elevationRequest?.unsubscribe();
    this.selectedRoute.set(null);
    this.elevation.set({ status: 'idle' });
  }

  private select(route: SidebarRoute): void {
    this.elevationRequest?.unsubscribe();
    this.selectedRoute.set(route);
    this.open();
  }

  /** Stats from the elevations stored in the GPX file, or null when it has too few of them */
  private fileElevationStats(track: GpxTrack): ElevationStats | null {
    const elevations = track.segments.flatMap((seg) => seg.elevations ?? []);
    const count = elevations.filter((ele) => ele !== null).length;
    return count >= MIN_FILE_ELEVATIONS ? computeElevationStats(elevations) : null;
  }

  private loadElevation(key: ElevationCacheKey, path: LatLon[]): void {
    const cached = this.elevationCache.get(key);
    if (cached) {
      this.elevation.set({ status: 'ready', stats: cached, source: 'open-meteo' });
      return;
    }
    if (path.length === 0) {
      this.elevation.set({ status: 'unavailable' });
      return;
    }

    this.elevation.set({ status: 'loading' });
    this.elevationRequest = this.elevationService.getElevationProfile(path).subscribe({
      next: (profile) => {
        const stats = computeElevationStats(profile);
        if (!stats) {
          this.elevation.set({ status: 'unavailable' });
          return;
        }
        this.elevationCache.set(key, stats);
        this.elevation.set({ status: 'ready', stats, source: 'open-meteo' });
      },
      error: () => this.elevation.set({ status: 'unavailable' }),
    });
  }
}
