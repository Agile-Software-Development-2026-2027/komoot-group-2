import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ROUTE_CATEGORY_CONFIG } from '../italy-map/italy-map';
import { RouteCategory, RouteDifficulty } from '../services/gpx.service';
import { ROUTE_NAME } from '../services/route-planner.service';
import { SidebarService } from '../services/sidebar.service';
import {
  DEFAULT_TRACK_STYLE,
  MAX_WEIGHT,
  MIN_WEIGHT,
  TrackStyleHandler,
} from '../services/track-style-handler.service';
import { ElevationStats, formatDistance, formatDuration } from '../utils/route-stats';

interface RouteSummary {
  isGpx: boolean;
  name: string;
  category?: RouteCategory;
  difficulty?: RouteDifficulty;
  distanceMeters: number;
  durationSeconds: number;
}

interface StatTile {
  label: string;
  /** null while the value is still loading */
  value: string | null;
}

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  protected readonly sidebar = inject(SidebarService);
  private readonly trackStyleHandler = inject(TrackStyleHandler);

  protected readonly previewPhotoUrl = signal<string | null>(null);

  /** "Custom Route": color and thickness of the tracks on the map (was Edit > Track design) */
  protected readonly isCustomizing = signal(false);
  protected readonly trackStyle = toSignal(this.trackStyleHandler.style$, { requireSync: true });
  protected readonly minWeight = MIN_WEIGHT;
  protected readonly maxWeight = MAX_WEIGHT;

  protected readonly summary = computed<RouteSummary | null>(() => {
    const selected = this.sidebar.selectedRoute();
    if (!selected) return null;

    if (selected.kind === 'planned') {
      return {
        isGpx: false,
        name: ROUTE_NAME,
        distanceMeters: selected.route.distanceMeters,
        durationSeconds: selected.route.durationSeconds,
      };
    }

    const { track } = selected;
    return {
      isGpx: true,
      name: track.name || 'GPX Route',
      category: track.category,
      difficulty: track.difficulty,
      distanceMeters: track.distanceMeters ?? 0,
      durationSeconds: track.estimatedDurationSeconds ?? 0,
    };
  });

  protected readonly stats = computed<StatTile[]>(() => {
    const summary = this.summary();
    if (!summary) return [];

    const elevation = this.sidebar.elevation();
    const altitude = (pick: (stats: ElevationStats) => number): string | null => {
      if (elevation.status === 'loading') return null;
      return elevation.status === 'ready' ? `${pick(elevation.stats).toLocaleString('en-US')} m` : '—';
    };

    return [
      { label: 'Distance', value: formatDistance(summary.distanceMeters) },
      { label: 'Estimated time', value: formatDuration(summary.durationSeconds) },
      { label: 'Max altitude', value: altitude((s) => s.maxMeters) },
      { label: 'Min altitude', value: altitude((s) => s.minMeters) },
      { label: 'Ascent', value: altitude((s) => s.ascentMeters) },
      { label: 'Descent', value: altitude((s) => s.descentMeters) },
    ];
  });

  /**
   * Photos of the selected GPX route's waypoints. Read on every check (not a computed signal)
   * so photos added later through "Custom Waypoint" show up too.
   */
  protected photos(): string[] {
    const selected = this.sidebar.selectedRoute();
    if (selected?.kind !== 'gpx') return [];
    return [...new Set(selected.waypoints.flatMap((wp) => wp.photos ?? []))];
  }

  /** Color the selected route currently has on the map (GPX tracks start with their category color) */
  protected routeColor(): string {
    const selected = this.sidebar.selectedRoute();
    return (selected?.kind === 'gpx' && selected.track.color) || this.trackStyle().color;
  }

  protected colorLabel(color: string): string {
    const selected = this.sidebar.selectedRoute();
    const category = selected?.kind === 'gpx' ? selected.track.category : undefined;
    if (category && color === ROUTE_CATEGORY_CONFIG[category].defaultColor) {
      return `Color category ${category}`;
    }
    return color === DEFAULT_TRACK_STYLE.color ? 'Default color' : 'Custom color';
  }

  protected onColorChange(event: Event): void {
    this.trackStyleHandler.setColor((event.target as HTMLInputElement).value);
  }

  protected onWeightChange(event: Event): void {
    this.trackStyleHandler.setWeight(Number((event.target as HTMLInputElement).value));
  }
}
