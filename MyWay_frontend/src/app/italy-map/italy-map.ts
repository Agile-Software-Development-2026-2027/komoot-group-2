import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { SIDEBAR_MAP_OVERLAP_PX, SidebarRoute, SidebarService } from '../services/sidebar.service';
import { WaypointService } from '../services/waypoint.service';
import { CURRENT_USER, MAX_WAYPOINT_DISTANCE_METERS, MOCK_ROUTE_PUBLISHER, PlatformWaypoint } from '../services/waypoint.model';
import { distanceToPolylineMeters } from '../utils/waypoint-distance.util';
import { Subscription, pairwise } from 'rxjs';
import * as L from 'leaflet';
import { GpxService, ParsedGpx, GpxWaypoint, WaypointCategory, GpxTrack, RouteCategory, RouteDifficulty } from '../services/gpx.service';
import { TrackStyleHandler } from '../services/track-style-handler.service';
import { LatLon, PlannedRoute, RoutePlannerService } from '../services/route-planner.service';
//import { SIDEBAR_MAP_OVERLAP_PX, SidebarService } from '../services/sidebar.service';
import { formatDistance, formatDuration } from '../utils/route-stats';

/** GpxWaypoint shape plus the distance from the selected route, used for platform waypoints */
type NearbyWaypoint = GpxWaypoint & { distanceMeters?: number };

L.Marker.prototype.options.icon = L.icon({
  iconUrl: 'leaflet/marker-icon.png',
  iconRetinaUrl: 'leaflet/marker-icon-2x.png',
  shadowUrl: 'leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const PEN_ICON = `
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 20h9" />
  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
</svg>`;

const LAYERS_ICON = `
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 2 10 5-10 5L2 7Z" />
  <path d="m2 12 10 5 10-5" />
  <path d="m2 17 10 5 10-5" />
</svg>`;

const START_ICON = L.divIcon({
  className: 'route-marker route-marker-start',
  html: 'A',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const END_ICON = L.divIcon({
  className: 'route-marker route-marker-end',
  html: 'B',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Required by the routing server usage policy (https://routing.openstreetmap.de/about.html)
const ROUTING_ATTRIBUTION =
  'Routing &copy; <a href="https://routing.openstreetmap.de/about.html">FOSSGIS OSRM</a>, ' +
  '<a href="https://www.openstreetmap.org/fixthemap">Fix the map</a>';

const CATEGORY_STYLES: Record<WaypointCategory, { svg: string; bgGradient: string; label: string }> = {
  'fountain': {
      label: 'Fountain',
      bgGradient: 'linear-gradient(135deg, #38bdf8, #0284c7)',//color:blue
      svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    },
    'shelter': {
      label: 'Shelter',
      bgGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',//color: amber
      svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    },
    'panoramic view': {
      label: 'Panoramic view',
      bgGradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',//color: purple
      svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/></svg>`,
    },
    'sanctuary': {
      label: 'Sanctuary',
      bgGradient: 'linear-gradient(135deg, #eab308, #ca8a04)', //color: yellow
      svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22V8a2 2 0 0 0-2-2h-3V2h-2v4H8a2 2 0 0 0-2 2v14"/><path d="M4 22h16"/><path d="M10 14h4v8h-4z"/></svg>`,
    },
    'peak': {
      label: 'Peak',
      bgGradient: 'linear-gradient(135deg, #f87171, #dc2626)', //color: red
      svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 20 7-14 4 6 3-3 6 11H2z"/></svg>`,
    },
};

const AVAILABLE_CATEGORIES: WaypointCategory[] = [
  'fountain',
  'shelter',
  'panoramic view',
  'sanctuary',
  'peak',
];

export const ROUTE_CATEGORY_CONFIG: Record<RouteCategory, { label: string; defaultColor: string; speedKmH: number }> = {
  'hiking':  { label: 'Hiking',  defaultColor: '#10b981', speedKmH: 4.0 },
  'cycling': { label: 'Cycling', defaultColor: '#2563eb', speedKmH: 15.0 },
  'running': { label: 'Running', defaultColor: '#f97316', speedKmH: 9.0 },
  'walking': { label: 'Walking', defaultColor: '#8b5cf6', speedKmH: 4.5 },
};

function calculateTrackDistanceMeters(track: GpxTrack): number {
  let totalMeters = 0;
  for (const seg of track.segments) {
    for (let i = 0; i < seg.points.length - 1; i++) {
      const p1 = L.latLng(seg.points[i][0], seg.points[i][1]);
      const p2 = L.latLng(seg.points[i + 1][0], seg.points[i + 1][1]);
      totalMeters += p1.distanceTo(p2);
    }
  }
  return Math.round(totalMeters);
}

export function calculateEstimatedDuration(distanceMeters: number, category: RouteCategory): number {
  const speedKmH = ROUTE_CATEGORY_CONFIG[category]?.speedKmH ?? 4.0;
  const speedMetersPerSec = (speedKmH * 1000) / 3600;
  return Math.round(distanceMeters / speedMetersPerSec);
}

function calculateDifficulty(distanceMeters: number): RouteDifficulty {
  if (distanceMeters < 5000) return 'easy';
  if (distanceMeters < 15000) return 'intermediate';
  return 'hard';
}

const DEFAULT_STYLE = {
  label: 'Waypoint',
  bgGradient: 'linear-gradient(135deg, #64748b, #334155)', //color: grey
  svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>`,
};
function createWaypointIcon(wp: GpxWaypoint): L.DivIcon {
  const primaryCat = wp.categories && wp.categories.length > 0 ? wp.categories[0] : null;
  const style = primaryCat ? CATEGORY_STYLES[primaryCat] : DEFAULT_STYLE;
  return L.divIcon({
    className: 'custom-wp-pin',
    html: `
      <div class="komoot-pin" style="background: ${style.bgGradient};" title="${wp.name || style.label}">
        <span class="komoot-pin-svg">${style.svg}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface MapStyle {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom?: number;
  subdomains?: string;
  swatch: string;
}

const MAP_STYLES: MapStyle[] = [
  {
    id: 'standard',
    label: 'Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    swatch: 'linear-gradient(135deg, #aad3df 0%, #f2efe9 50%, #b5d29c 100%)',
  },
  {
    id: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 18,
    maxNativeZoom: 17,
    subdomains: 'abc',
    swatch: 'linear-gradient(135deg, #c8e0b4 0%, #e8d9b0 50%, #b99a6b 100%)',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 18,
    swatch: 'linear-gradient(135deg, #1d3b2a 0%, #3d5a3a 50%, #1b3550 100%)',
  },
];

@Component({
  selector: 'app-italy-map',
  imports: [],
  templateUrl: './italy-map.html',
  styleUrl: './italy-map.css',
})
export class ItalyMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  private readonly gpxService = inject(GpxService);
  private readonly trackStyleHandler= inject(TrackStyleHandler);
  private readonly injector = inject(Injector);
  private readonly sidebar = inject(SidebarService);
  protected readonly routePlanner = inject(RoutePlannerService);
    private readonly waypointService = inject(WaypointService);

  /** When active, clicks on the map set the start and destination of a route */
  public readonly planningMode = signal(false);

  protected readonly routeHint = computed(() => {
    const route = this.routePlanner.route();
    if (this.routePlanner.loading()) return 'Calculating route…';
    if (route) return `${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)}`;
    if (!this.routePlanner.start()) return 'Click on the map to set the starting point';
    if (!this.routePlanner.end()) return 'Click on the map to set the destination';
    return 'Click on the map to start a new route';
  });

  private map?: L.Map;
  private baseLayer?: L.TileLayer;
  private currentStyleId = 'standard';
  private styleItems: { id: string; el: HTMLElement }[] = [];
  private stylePanel?: HTMLElement;
  private planButton?: HTMLAnchorElement;
  private plannedRouteGroup?: L.FeatureGroup; // start/end markers and planned route
  private routeLayer?: L.Polyline; // planned route line
  private routeSubscription?: Subscription;

  private gpxLayerGroup?: L.FeatureGroup;
  /** Visible lines of each rendered GPX track (without the invisible click areas) */
  private readonly trackLines = new Map<GpxTrack, L.Polyline[]>();
  private gpxSubscription?: Subscription;
  private styleSubscription?: Subscription;
    private nearbyLayerGroup?: L.FeatureGroup;
  private nearbySubscription?: Subscription;

  // Italy Border [N - S - E - W]
  private readonly italyBounds = L.latLngBounds([36.4, 6.7], [47.1, 18.6]);

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomSnap: 0.25,
      zoomDelta: 1,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: this.italyBounds.pad(0.5),
      maxBoundsViscosity: 0.8,
      zoomControl: false, // added below in the bottom-right corner, the top-left one is taken by the sidebar
    });

    // Default standard
    this.applyStyle(this.currentStyleId);

    // Zooming on Italy when open the website
    this.map.fitBounds(this.italyBounds, { padding: [10, 10] });

    // Bottom corners stack upwards: added first = lowest, so the zoom buttons end up above the tools
    L.control.zoom({ position: 'topleft' }).addTo(this.map);
    this.addToolsControl();


    // When click on the map the Map Style list will close; in planning mode it sets a route point
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.toggleStylePanel(false);
      this.closeWaypointDetails();
      if (!this.planningMode()) {
        this.sidebar.close();
      }
      if (this.planningMode()) {
        this.routePlanner.selectPoint({ lat: e.latlng.lat, lon: e.latlng.lng });
      }
    });

    // Redraw the start/end markers and the planned route whenever they change
    this.plannedRouteGroup = L.featureGroup().addTo(this.map);
    effect(
      () =>
        this.renderPlannedRoute(
          this.routePlanner.start(),
          this.routePlanner.end(),
          this.routePlanner.route(),
        ),
      { injector: this.injector },
    );

    // Whenever the route sidebar opens, the waypoint panel closes
    effect(
      () => {
        if (this.sidebar.isOpen()) {
          untracked(() => this.closeWaypointDetails());
        }
      },
      { injector: this.injector },
    );

     effect(
      () => {
        const selected = this.sidebar.selectedRoute();
        const enabled = this.sidebar.nearbyWaypointsEnabled();
        untracked(() => this.renderNearbyWaypoints(selected, enabled));
      },
      { injector: this.injector },
    );
    effect(
      () => {
        const update = this.sidebar.trackColorUpdate();
        if (update) {
          const lines = this.trackLines.get(update.track);
          lines?.forEach((line) => line.setStyle({ color: update.color }));
        }
      },
      { injector: this.injector },
    );

    // Subscribe to loaded GPX
    this.gpxSubscription = this.gpxService.currentGpx$.subscribe((gpx) => {
      if (gpx) {
        this.renderGpx(gpx);
      }
    });
    // Update the tracks when the user changes color or thickness ("Custom Route" in the sidebar).
    // Only what changed is applied, so a new thickness keeps each GPX track's category color.
    this.styleSubscription = this.trackStyleHandler.style$.pipe(pairwise()).subscribe(([previous, style]) => {
      const changes: L.PathOptions = {};
      if (style.color !== previous.color) changes.color = style.color;
      if (style.weight !== previous.weight) changes.weight = style.weight;

      for (const [track, lines] of this.trackLines) {
        if (changes.color) track.color = changes.color; // keep the sidebar in sync with the map
        lines.forEach((line) => line.setStyle(changes)); // not the wide invisible click areas
      }
      this.routeLayer?.setStyle(changes);
    });
  }

  /** Turns route planning on/off; the planned route stays on the map when turned off */
  public togglePlanningMode(): void {
    const enabled = !this.planningMode();
    this.planningMode.set(enabled);
    this.planButton?.classList.toggle('active', enabled);
    this.mapContainer.nativeElement.classList.toggle('planning-mode', enabled);
  }

  private renderPlannedRoute(start: LatLon | null, end: LatLon | null, route: PlannedRoute | null): void {
    if (!this.map || !this.plannedRouteGroup) return;

    this.plannedRouteGroup.clearLayers();
    this.routeLayer = undefined;
    this.map.attributionControl.removeAttribution(ROUTING_ATTRIBUTION);

    if (route) {
      const { color, weight } = this.trackStyleHandler.getCurrentStyle();
      this.routeLayer = L.polyline(
        route.points.map((p): L.LatLngTuple => [p.lat, p.lon]),
        { color, weight, opacity: 0.85, lineJoin: 'round' },
      ).addTo(this.plannedRouteGroup);
      // Outside planning mode a click shows the route stats; in planning mode it reaches the map and sets a point
        this.routeLayer.on('click', (e: L.LeafletMouseEvent) => {
        if (this.planningMode()) return;
        L.DomEvent.stopPropagation(e);
        this.closeWaypointDetails();
        this.sidebar.showPlannedRoute(route);
      });
      this.map.attributionControl.addAttribution(ROUTING_ATTRIBUTION);
    }
    if (start) {
      L.marker([start.lat, start.lon], { icon: START_ICON, title: 'Start' }).addTo(this.plannedRouteGroup);
    }
    if (end) {
      L.marker([end.lat, end.lon], { icon: END_ICON, title: 'Destination' }).addTo(this.plannedRouteGroup);
    }
  }

  /**
   * Renders parsed GPX tracks and waypoints on the Leaflet map.
   */
  public renderGpx(data: ParsedGpx): void {
    if (!this.map) return;

    if (!this.gpxLayerGroup) {
      this.gpxLayerGroup = L.featureGroup().addTo(this.map);
    } else {
      this.gpxLayerGroup.clearLayers();
    }
    this.trackLines.clear();

    // 1. Draw tracks and routes
    const{weight}=this.trackStyleHandler.getCurrentStyle();
    for (const track of data.tracks) {
      if (!track.category) track.category = 'hiking';
      if (!track.color) track.color = ROUTE_CATEGORY_CONFIG[track.category].defaultColor;
      if (track.distanceMeters === undefined) track.distanceMeters = calculateTrackDistanceMeters(track);
      if (track.estimatedDurationSeconds === undefined) {
        track.estimatedDurationSeconds = calculateEstimatedDuration(track.distanceMeters, track.category);
      }
      if (!track.difficulty) track.difficulty = calculateDifficulty(track.distanceMeters);
      // ⚠️ MOCK metadata until the Backend provides publisher/visibility
      track.publisher ??= MOCK_ROUTE_PUBLISHER;
      track.isPublic ??= true;

      const lines: L.Polyline[] = [];
      this.trackLines.set(track, lines);
      for (const seg of track.segments) {
        if (seg.points.length > 0) {
          const polyline = L.polyline(seg.points, {
            color: track.color,
            weight: weight,
            opacity: 0.85,
            lineJoin: 'round',
          });

          const hitPolyline = L.polyline(seg.points, {
            weight: 22,
            opacity: 0,
            interactive: true,
          });
            const onTrackClick = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            this.closeWaypointDetails(); // close the waypoint panel, the route panel replaces it
            this.sidebar.showTrack(track, data.waypoints);
          };

          polyline.on('click', onTrackClick);
          hitPolyline.on('click', onTrackClick);

          polyline.addTo(this.gpxLayerGroup);
          hitPolyline.addTo(this.gpxLayerGroup);
          lines.push(polyline);
        }
      }
    }

    // 2. Draw waypoints
    for (const wp of data.waypoints) {
      const marker = L.marker([wp.lat, wp.lon], {icon: createWaypointIcon(wp)});
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.activeMarker = marker;
        this.openWaypointDetails(wp);
      });
      marker.addTo(this.gpxLayerGroup);
    }

    // 3. Auto-zoom
    const bounds = this.gpxLayerGroup.getBounds();
    if (bounds.isValid()) {
      // Clear strict bounds so tracks outside Italy can be viewed
      this.map.setMaxBounds(undefined);
      const padding = 40;
      // Keep the track out from under the sidebar when it is open on the right
      const rightPadding = this.sidebar.isOpen() ? Math.min(SIDEBAR_MAP_OVERLAP_PX, this.map.getSize().x / 2) : padding;
      this.map.fitBounds(bounds, {
        paddingTopLeft: [padding, padding],
        paddingBottomRight: [rightPadding, padding],
        maxZoom: 16,
      });
    }
  }

  //POP-UP Showing Info
  public selectedWaypoint = signal<NearbyWaypoint  | null>(null);
  public openWaypointDetails(wp: NearbyWaypoint ): void {
    this.selectedWaypoint.set(wp);
    this.sidebar.close();
  }
  public closeWaypointDetails(): void {
    this.selectedWaypoint.set(null);
    this.isEditingWaypoint.set(false);

  }

  public previewPhotoUrl = signal<string | null>(null);
  public openPhotoPreview(url: string): void {
    this.previewPhotoUrl.set(url);
  }
  public closePhotoPreview(): void {
    this.previewPhotoUrl.set(null);
  }

  //POP-UP Adding Info
  public readonly availableCategories = AVAILABLE_CATEGORIES;
  public isEditingWaypoint = signal<boolean>(false);
  public editCategories = signal<WaypointCategory[]>([]);
  public editDesc = signal<string>('');
  public editPhotos = signal<string[]>([]);
  private activeMarker?: L.Marker;

  public openEditModal(): void {
    const wp = this.selectedWaypoint();
    if (!wp) return;
    this.editCategories.set(wp.categories ? [...wp.categories] : []);
    this.editDesc.set(wp.desc || '');
    this.editPhotos.set(wp.photos ? [...wp.photos] : []);
    this.isEditingWaypoint.set(true);
  }

  public closeEditModal(): void {
    this.isEditingWaypoint.set(false);
  }

  public toggleCategory(cat: WaypointCategory): void {
    const current = this.editCategories();
    if (current.includes(cat)) {
      this.editCategories.set(current.filter((c) => c !== cat));
    } else {
      this.editCategories.set([...current, cat]);
    }
  }

  public onDescInput(event: Event): void {
    this.editDesc.set((event.target as HTMLTextAreaElement).value);
  }

  //read image file and covert it in Base64
  public onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    const MAX_SIZE = 5 * 1024 * 1024; // max 5 MB for each photo

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`The file "${file.name}" is not a valid image.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        alert(`The image "${file.name}" exceeds the 5 MB limit.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.editPhotos.update((photos) => [...photos, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  public removePhoto(index: number): void {
    this.editPhotos.update((photos) => photos.filter((_, i) => i !== index));
  }

  public saveWaypointChanges(): void {
    const wp = this.selectedWaypoint();
    if (!wp) return;

    wp.categories = this.editCategories();
    wp.desc = this.editDesc();
    wp.photos = this.editPhotos();

    this.selectedWaypoint.set({ ...wp });

    if (this.activeMarker) {
      this.activeMarker.setIcon(createWaypointIcon(wp));
    }

    this.closeEditModal();
  }

    /** Draws (or removes) the PlatformWaypoint markers within MAX_WAYPOINT_DISTANCE_METERS of the selected route */
  private renderNearbyWaypoints(selected: SidebarRoute | null, enabled: boolean): void {
    if (!this.map) return;

    this.nearbySubscription?.unsubscribe();
    this.nearbyLayerGroup ??= L.featureGroup().addTo(this.map);
    this.nearbyLayerGroup.clearLayers(); // also avoids duplicate markers
    this.sidebar.nearbyWaypointCount.set(0);

    if (!enabled || selected?.kind !== 'gpx' || !this.sidebar.canShowNearbyWaypoints()) return;

    const routePoints = selected.track.segments.flatMap((seg) =>
      seg.points.map(([lat, lon]) => ({ lat, lon })),
    );

    this.nearbySubscription = this.waypointService.getWaypoints().subscribe((all) => {
      const nearby = all
        .filter((wp) => this.waypointService.isVisibleToUser(wp, CURRENT_USER))
        .map((wp) => ({
          wp,
          distance: distanceToPolylineMeters({ lat: wp.latitude, lon: wp.longitude }, routePoints),
        }))
        .filter((item) => item.distance <= MAX_WAYPOINT_DISTANCE_METERS)
        .sort((a, b) => a.distance - b.distance);

      nearby.forEach((item) => this.addPlatformWaypointMarker(item.wp, item.distance));
      this.sidebar.nearbyWaypointCount.set(nearby.length);
    });
  }

  private addPlatformWaypointMarker(wp: PlatformWaypoint, distanceMeters: number): void {
    // The existing waypoint panel accepts a GpxWaypoint, so the platform waypoint is converted to that shape
    const asGpx: NearbyWaypoint = {
      lat: wp.latitude,
      lon: wp.longitude,
      name: wp.name,
      desc: wp.description,
      categories: [wp.category],
      photos: wp.photos,
      distanceMeters,
    };
    const marker = L.marker([wp.latitude, wp.longitude], { icon: createWaypointIcon(asGpx) });
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      this.activeMarker = marker;
      this.openWaypointDetails(asGpx);
    });
    marker.addTo(this.nearbyLayerGroup!);
  }

  /** 450 -> "450 m", 1200 -> "1.2 km" */
  protected formatWaypointDistance(meters: number): string {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Switch the style to the selected style */
  private applyStyle(styleId: string): void {
    const style = MAP_STYLES.find((s) => s.id === styleId);
    if (!style || !this.map) return;

    if (this.baseLayer) {
      this.map.removeLayer(this.baseLayer);
    }

    this.baseLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: style.maxZoom,
      maxNativeZoom: style.maxNativeZoom,
      subdomains: style.subdomains ?? 'abc',
    }).addTo(this.map);

    this.baseLayer.bringToBack();

    if (this.routeLayer) {
      this.routeLayer.bringToFront();
    }

    this.currentStyleId = styleId;
    this.styleItems.forEach((item) =>
      item.el.classList.toggle('active', item.id === styleId),
    );
  }

  /** Pen and Map Style icons */
  private addToolsControl(): void {
    const tools = new L.Control({ position: 'topleft' });

    tools.onAdd = () => {
      const container = L.DomUtil.create('div', 'map-tools');
      const bar = L.DomUtil.create('div', 'leaflet-bar', container);

      // Pen icon: plan a route by clicking a start and a destination
      this.planButton = this.createToolButton(bar, PEN_ICON, 'Plan a route', () => {
        this.togglePlanningMode();
      });

      // Map Style icon
      this.createToolButton(bar, LAYERS_ICON, 'Map style', () => {
        this.toggleStylePanel();
      });

      // Map Style
      this.stylePanel = this.createStylePanel(container);

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };

    tools.addTo(this.map!);
  }

  private createStylePanel(parent: HTMLElement): HTMLElement {
    const panel = L.DomUtil.create('div', 'style-panel', parent);
    panel.setAttribute('role', 'menu');

    const title = L.DomUtil.create('div', 'style-panel-title', panel);
    title.textContent = 'Map style';

    this.styleItems = MAP_STYLES.map((style) => {
      const item = L.DomUtil.create('button', 'style-item', panel) as HTMLButtonElement;
      item.type = 'button';
      item.setAttribute('role', 'menuitemradio');

      const label = L.DomUtil.create('span', 'style-label', item);
      label.textContent = style.label;

      const check = L.DomUtil.create('span', 'style-check', item);
      check.textContent = '✓';

      if (style.id === this.currentStyleId) {
        item.classList.add('active');
      }

      L.DomEvent.on(item, 'click', (e) => {
        L.DomEvent.stop(e);
        this.applyStyle(style.id);
        this.toggleStylePanel(false);
      });

      return { id: style.id, el: item };
    });

    return panel;
  }

  private toggleStylePanel(force?: boolean): void {
    if (!this.stylePanel) return;
    const open = force ?? !this.stylePanel.classList.contains('open');
    this.stylePanel.classList.toggle('open', open);
  }

  private createToolButton(
    container: HTMLElement,
    iconSvg: string,
    title: string,
    onClick: () => void,
  ): HTMLAnchorElement {
    const btn = L.DomUtil.create('a', 'map-tool-btn', container) as HTMLAnchorElement;
    btn.href = '#';
    btn.title = title;
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', title);
    btn.innerHTML = iconSvg;

    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.preventDefault(e);
      onClick();
    });
    return btn;
  }

  ngOnDestroy(): void {
    this.gpxSubscription?.unsubscribe();
    this.styleSubscription?.unsubscribe();
    this.map?.remove();
    this.nearbySubscription?.unsubscribe();
  }

}
