import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { GpxService, ParsedGpx } from '../services/gpx.service';

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

  private map?: L.Map;
  private baseLayer?: L.TileLayer;
  private currentStyleId = 'standard';
  private styleItems: { id: string; el: HTMLElement }[] = [];
  private stylePanel?: HTMLElement;

  private gpxLayerGroup?: L.FeatureGroup;
  private gpxSubscription?: Subscription;

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

    // When click on the map the Map Style list will close
    this.map.on('click', () => this.toggleStylePanel(false));

    // Mark Roma
    L.marker([41.9028, 12.4964]).addTo(this.map).bindPopup('Roma');

    // Subscribe to loaded GPX
    this.gpxSubscription = this.gpxService.currentGpx$.subscribe((gpx) => {
      if (gpx) {
        this.renderGpx(gpx);
      }
    });
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
    for (const track of data.tracks) {
      for (const seg of track.segments) {
        if (seg.points.length > 0) {
          const polyline = L.polyline(seg.points, {
            color: '#0284c7',
            weight: 5,
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
      const marker = L.marker([wp.lat, wp.lon]);
      let popupContent = '<div class="waypoint-popup" style="font-family: inherit;">';
      if (wp.name) {
        popupContent += `<strong style="font-size: 14px;">${this.escapeHtml(wp.name)}</strong>`;
      } else {
        popupContent += `<strong style="font-size: 14px;">Waypoint</strong>`;
      }
      if (wp.desc) {
        popupContent += `<div style="font-size: 12px; margin-top: 4px; color: #4b5563;">${this.escapeHtml(wp.desc)}</div>`;
      }
      if (wp.ele !== undefined && !isNaN(wp.ele)) {
        popupContent += `<div style="font-size: 12px; margin-top: 4px; color: #1e293b;"><b>Altitude:</b> ${wp.ele} m</div>`;
      }
      const latDir = wp.lat >= 0 ? 'N' : 'S';
      const lonDir = wp.lon >= 0 ? 'E' : 'W';
      popupContent += `<div style="font-size: 11px; margin-top: 4px; color: #64748b;">${Math.abs(wp.lat).toFixed(5)}° ${latDir}, ${Math.abs(wp.lon).toFixed(5)}° ${lonDir}</div>`;
      popupContent += '</div>';

      marker.bindPopup(popupContent);
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

      // Pen icon is not active now
      this.createToolButton(bar, PEN_ICON, 'Draw a point', () => {});

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
    this.map?.remove();
  }
}
