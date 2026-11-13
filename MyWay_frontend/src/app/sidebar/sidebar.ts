import { Component, computed, inject, signal } from '@angular/core';
import { MAX_WAYPOINT_DISTANCE_METERS } from '../services/waypoint.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { ROUTE_CATEGORY_CONFIG, calculateEstimatedDuration } from '../italy-map/italy-map';
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

interface RouteColor {
  value: string;
  /** Where the color comes from: the route category, the default style or the user */
  label: string;
}

const AVAILABLE_ROUTE_CATEGORIES: RouteCategory[] = ['hiking', 'cycling', 'running', 'walking'];
const AVAILABLE_ROUTE_DIFFICULTIES: RouteDifficulty[] = ['easy', 'intermediate', 'hard'];
const PRESET_TRACK_COLORS = [
  '#10b981', '#2563eb', '#f97316', '#8b5cf6',
  '#ef4444', '#f59e0b', '#06b6d4', '#334155',
];

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

  /** "Custom Route": color and thickness of the tracks on the map */
  protected readonly trackStyle = toSignal(this.trackStyleHandler.style$, { requireSync: true });
  protected readonly minWeight = MIN_WEIGHT;
  protected readonly maxWeight = MAX_WEIGHT;
    protected readonly maxDistanceKm = MAX_WAYPOINT_DISTANCE_METERS / 1000;

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

  /**
   * Color the selected route currently has on the map (GPX tracks start with their category color).
   * Read on every check, like photos(): the map updates track.color in place.
   */
  protected routeColor(): RouteColor {
    const selected = this.sidebar.selectedRoute();
    const track = selected?.kind === 'gpx' ? selected.track : undefined;
    const value = track?.color || this.trackStyle().color;

    if (track?.category && value === ROUTE_CATEGORY_CONFIG[track.category].defaultColor) {
      return { value, label: `Color category ${track.category}` };
    }
    return { value, label: value === DEFAULT_TRACK_STYLE.color ? 'Default color' : 'Custom color' };
  }

protected readonly availableRouteCategories = AVAILABLE_ROUTE_CATEGORIES;
protected readonly availableRouteDifficulties = AVAILABLE_ROUTE_DIFFICULTIES;
protected readonly presetTrackColors = PRESET_TRACK_COLORS;

protected readonly isEditingTrack = signal(false);
protected readonly editTrackName = signal('');
protected readonly editTrackCategory = signal<RouteCategory>('hiking');
protected readonly editTrackDifficulty = signal<RouteDifficulty>('intermediate');
protected readonly editTrackColor = signal('#10b981');
protected readonly editTrackWeight = signal(5);

protected openEditTrackModal(): void {
  const selected = this.sidebar.selectedRoute();
  if (!selected) return;

  this.editTrackWeight.set(this.trackStyle().weight);
  if (selected.kind === 'gpx') {
    const { track } = selected;
    this.editTrackName.set(track.name || 'GPX Route');
    this.editTrackCategory.set(track.category || 'hiking');
    this.editTrackDifficulty.set(track.difficulty || 'intermediate');
    this.editTrackColor.set(track.color || ROUTE_CATEGORY_CONFIG[this.editTrackCategory()].defaultColor);
  } else {
    this.editTrackName.set(ROUTE_NAME);
    this.editTrackColor.set(this.trackStyle().color);
  }
  this.isEditingTrack.set(true);
}

protected closeEditTrackModal(): void {
  this.isEditingTrack.set(false);
}

protected setTrackCategory(cat: RouteCategory): void {
  this.editTrackCategory.set(cat);
  this.editTrackColor.set(ROUTE_CATEGORY_CONFIG[cat].defaultColor);
}

protected saveTrackChanges(): void {
  const selected = this.sidebar.selectedRoute();
  if (!selected) return;

  this.trackStyleHandler.setWeight(this.editTrackWeight());

  if (selected.kind === 'gpx') {
    const { track } = selected;
    track.name = this.editTrackName();
    track.category = this.editTrackCategory();
    track.difficulty = this.editTrackDifficulty();
    track.color = this.editTrackColor();
    if (track.distanceMeters !== undefined) {
      track.estimatedDurationSeconds = calculateEstimatedDuration(track.distanceMeters, track.category);
    }
    this.sidebar.updateGpxTrack(track);
  } else {
    this.trackStyleHandler.setColor(this.editTrackColor());
  }

  this.closeEditTrackModal();
}
}
