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
} from '@angular/core';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { GpxService, ParsedGpx, GpxWaypoint, WaypointCategory } from '../services/gpx.service';
import { TrackStyleHandler } from '../services/track-style-handler.service';
import { LatLon, PlannedRoute, RoutePlannerService } from '../services/route-planner.service';

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

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
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
  protected readonly routePlanner = inject(RoutePlannerService);

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
  private gpxSubscription?: Subscription;
  private styleSubscription?: Subscription;

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
    });

    // Default standard
    this.applyStyle(this.currentStyleId);

    // Zooming on Italy when open the website
    this.map.fitBounds(this.italyBounds, { padding: [10, 10] });

    this.addToolsControl();

    // When click on the map the Map Style list will close; in planning mode it sets a route point
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.toggleStylePanel(false);
      this.closeWaypointDetails();
      if (this.planningMode()) {
        this.routePlanner.selectPoint({ lat: e.latlng.lat, lon: e.latlng.lng });
      }
    });

    // Mark Roma
    L.marker([41.9028, 12.4964]).addTo(this.map).bindPopup('Roma');

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

    // Subscribe to loaded GPX
    this.gpxSubscription = this.gpxService.currentGpx$.subscribe((gpx) => {
      if (gpx) {
        this.renderGpx(gpx);
      }
    });
        // Update the GPX track when the user changes color or thickness
    this.styleSubscription = this.trackStyleHandler.style$.subscribe((style) => {
      this.gpxLayerGroup?.setStyle({ color: style.color, weight: style.weight });
      this.routeLayer?.setStyle({ color: style.color, weight: style.weight });
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
        { color, weight, opacity: 0.85, lineJoin: 'round', interactive: false },
      ).addTo(this.plannedRouteGroup);
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

    // 1. Draw tracks and routes
    const{color,weight}=this.trackStyleHandler.getCurrentStyle();
    for (const track of data.tracks) {
      for (const seg of track.segments) {
        if (seg.points.length > 0) {
          const polyline = L.polyline(seg.points, {
            color: color,
            weight: weight,
            opacity: 0.85,
            lineJoin: 'round',
          });
          if (track.name) {
            polyline.bindPopup(`<b>Traccia:</b> ${this.escapeHtml(track.name)}`);
          }
          polyline.addTo(this.gpxLayerGroup);
        }
      }
    }

    // 2. Draw waypoints
    for (const wp of data.waypoints) {
      const marker = L.marker([wp.lat, wp.lon], {icon: createWaypointIcon(wp)});
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.openWaypointDetails(wp);
      });
      marker.addTo(this.gpxLayerGroup);
    }

    // 3. Auto-zoom
    const bounds = this.gpxLayerGroup.getBounds();
    if (bounds.isValid()) {
      // Clear strict bounds so tracks outside Italy can be viewed
      this.map.setMaxBounds(undefined);
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }

  public selectedWaypoint = signal<GpxWaypoint | null>(null);
  public openWaypointDetails(wp: GpxWaypoint): void {
    this.selectedWaypoint.set(wp);
  }
  public closeWaypointDetails(): void {
    this.selectedWaypoint.set(null);
  }

  public previewPhotoUrl = signal<string | null>(null);
  public openPhotoPreview(url: string): void {
    this.previewPhotoUrl.set(url);
  }
  public closePhotoPreview(): void {
    this.previewPhotoUrl.set(null);
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
  }

}
