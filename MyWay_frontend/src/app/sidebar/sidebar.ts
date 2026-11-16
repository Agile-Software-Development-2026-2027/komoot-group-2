import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http'; // Import HttpClient for backend requests
import { ROUTE_CATEGORY_CONFIG, calculateEstimatedDuration } from '../italy-map/italy-map';
import { GpxService, GpxTrack, GpxTrackSegment, ParsedGpx, RouteCategory, RouteDifficulty } from '../services/gpx.service';
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
interface PointPayload {
  latitude: number;
  longitude: number;
  elevation: number | null;
}


const API_URL = 'http://localhost:8080/api';

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
  private readonly http = inject(HttpClient); // (add) Inject HttpClient for backend requests
  private readonly gpxService = inject(GpxService);
  // (add) Temporary user email used for testing / until full auth is wired up
  private readonly currentUserEmail = 'test@example.com';

  protected readonly previewPhotoUrl = signal<string | null>(null);
  /** "Custom Route": color and thickness of the tracks on the map */
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

// Save route logic and folder selection state/handlers connected to the real backend
  protected readonly isSavingRoute = signal(false);
  protected readonly userFolders = signal<{ id: number; name: string; userEmail: string }[]>([]);
  protected readonly selectedFolderId = signal<number | null>(null);
  protected readonly newFolderName = signal('');

  protected readonly savedRoutes = signal<{ id: number; name: string }[]>([]);
  protected readonly activeFolderIdForRoutes = signal<number | null>(null);
/** Name chosen by the user for the route to save (pre-filled with the current name) */
  protected readonly routeNameToSave = signal('');
    constructor() {
    // Show the folders as soon as the sidebar is created
    this.loadFolders();
  }

  private loadFolders(): void {
    this.http.get<any[]>(`${API_URL}/folders?userEmail=${encodeURIComponent(this.currentUserEmail)}`).subscribe({
      next: (folders) => this.userFolders.set(folders),
      error: (err) => console.error('Error fetching folders from backend:', err),
    });
  }
  protected fetchRoutesForFolder(folderId: number): void {
    this.activeFolderIdForRoutes.set(folderId);
    
    this.http.get<any[]>(`${API_URL}/routes?folderId=${folderId}`).subscribe({
      next: (routes) => {
        this.savedRoutes.set(routes);
        console.log(`Loaded ${routes.length} routes for folder ID ${folderId}:`, routes);
      },
      error: (err) => {
        console.error('Error fetching saved routes:', err);
        this.savedRoutes.set([]);
      }
    });
  }


  protected openSaveRouteModal(): void {
    const selected = this.sidebar.selectedRoute();
    if (!selected) return;

    this.selectedFolderId.set(null);
    this.newFolderName.set('');
    this.routeNameToSave.set(this.summary()?.name || 'My Route');
    this.isSavingRoute.set(true);

  this.loadFolders();
  }

  protected closeSaveRouteModal(): void {
    this.isSavingRoute.set(false);
    this.selectedFolderId.set(null);
    this.newFolderName.set('');
  }

  
  // Ensures only one option is active at a time: selecting a folder clears the new name input
  protected onFolderSelected(value: string): void {
    const id = value ? +value : null;
    this.selectedFolderId.set(id);
    if (id !== null) {
      this.newFolderName.set('');
    }
  }

  // Ensures only one option is active at a time: typing a new folder name clears the dropdown selection
  protected onNewFolderInput(value: string): void {
    this.newFolderName.set(value);
    if (value.trim() !== '') {
      this.selectedFolderId.set(null);
    }
  }

     // Loads a saved route from the backend and draws it on the map
  protected loadRouteToMap(routeId: number): void {
    this.http.get<any>(`${API_URL}/routes/${routeId}`).subscribe({
      next: (route) => {
        const points: { latitude: number; longitude: number; elevation: number | null }[] = route.points ?? [];
        if (points.length === 0) {
          alert('This route has no saved points.');
          return;
        }

        // Backend points -> GPX track (same shape the map already knows how to draw)
        const segment: GpxTrackSegment = {
          points: points.map((p): [number, number] => [p.latitude, p.longitude]),
        };
        if (points.some((p) => p.elevation !== null && p.elevation !== undefined)) {
          segment.elevations = points.map((p) => p.elevation ?? null);
        }

        const track: GpxTrack = { name: route.name, segments: [segment] };
        const parsed: ParsedGpx = {
          fileName: route.name,
          waypoints: [],
          tracks: [track],
          allCoordinates: segment.points,
        };

        this.gpxService.showParsedGpx(parsed);  // the map draws it and zooms on it
        this.sidebar.showTrack(track, []);      // the sidebar shows its stats
      },
      error: (err) => {
        console.error('Error loading route details:', err);
        alert('Error loading the route.');
      },
    });
  }
  protected confirmSaveRoute(): void {
    const selected = this.sidebar.selectedRoute();
    if (!selected) return;
    
    const folderId = this.selectedFolderId();
    const newName = this.newFolderName().trim();
    const routeName = this.routeNameToSave().trim();

    if (!routeName) {
      alert('Please enter a route name.');
      return;
    }
    
    if (!folderId && !newName) {
      alert('Please select an existing folder or type a new folder name.');
      return;
    }

    if (newName) {
      // 1. Create the new folder first, then use its returned ID to save the route
      this.http.post<any>(`${API_URL}/folders?name=${encodeURIComponent(newName)}&userEmail=${this.currentUserEmail}`, {}).subscribe({
        next: (createdFolder) => {
          console.log('New folder created successfully:', createdFolder);
          this.saveRouteToBackend(createdFolder.id, routeName);
        },
        error: (err) => {
          console.error('Error creating new folder:', err);
        }
      });
    } else if (folderId) {
      // 2. Save directly into the selected existing folder ID
      this.saveRouteToBackend(folderId, routeName);
    }
  }

    /** Converts the selected route (GPX track or planned route) into the points sent to the backend */
  private extractPoints(): PointPayload[] {
    const selected = this.sidebar.selectedRoute();
    if (!selected) return [];

    if (selected.kind === 'planned') {
      return selected.route.points.map((p) => ({
        latitude: p.lat,
        longitude: p.lon,
        elevation: null,
      }));
    }

    return selected.track.segments.flatMap((seg) =>
      seg.points.map(([lat, lon], i) => ({
        latitude: lat,
        longitude: lon,
        elevation: seg.elevations?.[i] ?? null,
      })),
    );
  }

    // POST /api/routes with a JSON body: folder, name and points of the route
  private saveRouteToBackend(folderId: number, routeName: string): void {
    const body = { folderId, name: routeName, points: this.extractPoints() };

    this.http.post<any>(`${API_URL}/routes`, body).subscribe({
      next: (savedRoute) => {
        console.log('Route saved successfully to database:', savedRoute);
        alert('Route saved successfully!');
        this.closeSaveRouteModal();
        this.loadFolders();                  // the new folder shows up in the list
        this.fetchRoutesForFolder(folderId); // and its routes are displayed
      },
      error: (err) => {
        console.error('Error saving route to backend:', err);
        alert('Error saving the route. Check the console.');
      },
    });
  }
}