import { Injectable, computed, signal } from '@angular/core';

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  name?: string;
  time?: string;
}

export interface RouteData {
  name: string;
  points: TrackPoint[];
  waypoints?: TrackPoint[];
}

// Default route used when no custom track has been uploaded or drawn yet
const DEFAULT_ROUTE: RouteData = {
  name: 'Rome Route',
  points: [
    { lat: 41.9028, lon: 12.4964, ele: 21, name: 'Start - Colosseum' },
    { lat: 41.8986, lon: 12.4768, ele: 17, name: 'Pantheon' },
    { lat: 41.9029, lon: 12.4534, ele: 19, name: 'End - St. Peter Square' },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class GpxExportService {
  readonly route = signal<RouteData>(DEFAULT_ROUTE);
  readonly hasRoute = computed(() => this.route().points.length > 0);

  /** Replace the current route data */
  setRoute(route: RouteData): void {
    this.route.set({
      name: route.name?.trim() || 'MyWay Route',
      points: [...route.points],
      waypoints: route.waypoints ? [...route.waypoints] : undefined,
    });
  }

  /** Replace the current track points and route name */
  setPoints(points: TrackPoint[], name = 'MyWay Route'): void {
    this.route.set({
      name: name.trim() || 'MyWay Route',
      points: [...points],
    });
  }

  /** Append a single track point to the current route */
  addPoint(point: TrackPoint): void {
    this.route.update((current) => ({
      ...current,
      points: [...current.points, point],
    }));
  }

  /** Clear all points from the current route */
  clearRoute(): void {
    this.route.set({ name: 'MyWay Route', points: [] });
  }

  /** Parse track, route, and waypoint data from a GPX XML string */
  loadFromGpxXml(xmlContent: string, fallbackName = 'Exported Route'): void {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlContent, 'application/xml');
    if (xml.querySelector('parsererror')) {
      return;
    }

    const trkName =
      xml.getElementsByTagNameNS('*', 'trk')[0]?.getElementsByTagNameNS('*', 'name')[0]
        ?.textContent ??
      xml.getElementsByTagNameNS('*', 'rte')[0]?.getElementsByTagNameNS('*', 'name')[0]
        ?.textContent ??
      xml.getElementsByTagNameNS('*', 'name')[0]?.textContent ??
      fallbackName;

    const trkPoints = this.extractPoints(xml, 'trkpt');
    const rtePoints = this.extractPoints(xml, 'rtept');
    const waypoints = this.extractPoints(xml, 'wpt');

    const points = trkPoints.length > 0 ? trkPoints : rtePoints;

    if (points.length > 0 || waypoints.length > 0) {
      this.setRoute({
        name: trkName.trim() || fallbackName,
        points,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
      });
    }
  }

  /** Generate a valid GPX 1.1 XML string containing the route track */
  generateGpx(routeData: RouteData = this.route()): string {
    const routeName = this.escapeXml(routeData.name?.trim() || 'MyWay Route');
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="MyWay" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
      '  <metadata>',
      `    <name>${routeName}</name>`,
      '  </metadata>',
    ];

    if (routeData.waypoints && routeData.waypoints.length > 0) {
      for (const wpt of routeData.waypoints) {
        lines.push(...this.formatPointXml('wpt', wpt, '  '));
      }
    }

    lines.push('  <trk>');
    lines.push(`    <name>${routeName}</name>`);
    lines.push('    <trkseg>');

    for (const pt of routeData.points) {
      lines.push(...this.formatPointXml('trkpt', pt, '      '));
    }

    lines.push('    </trkseg>');
    lines.push('  </trk>');
    lines.push('</gpx>');

    return lines.join('\n');
  }

  /** Trigger a browser download of the generated GPX file */
  downloadGpx(filename?: string, routeData: RouteData = this.route()): string {
    const gpxContent = this.generateGpx(routeData);
    const resolvedFilename = this.resolveFilename(filename ?? routeData.name);

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = resolvedFilename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    return gpxContent;
  }

  private formatPointXml(tag: 'trkpt' | 'wpt', pt: TrackPoint, indent: string): string[] {
    const attrs = `lat="${pt.lat}" lon="${pt.lon}"`;
    const children: string[] = [];

    if (pt.ele !== undefined && pt.ele !== null && !Number.isNaN(pt.ele)) {
      children.push(`${indent}  <ele>${pt.ele}</ele>`);
    }
    if (pt.time) {
      children.push(`${indent}  <time>${this.escapeXml(pt.time)}</time>`);
    }
    if (pt.name) {
      children.push(`${indent}  <name>${this.escapeXml(pt.name)}</name>`);
    }

    if (children.length === 0) {
      return [`${indent}<${tag} ${attrs}></${tag}>`];
    }

    return [`${indent}<${tag} ${attrs}>`, ...children, `${indent}</${tag}>`];
  }

  private extractPoints(xml: Document, tagName: string): TrackPoint[] {
    const elements = Array.from(xml.getElementsByTagNameNS('*', tagName));
    const points: TrackPoint[] = [];

    for (const el of elements) {
      const lat = Number.parseFloat(el.getAttribute('lat') ?? '');
      const lon = Number.parseFloat(el.getAttribute('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        continue;
      }

      const eleText = el.getElementsByTagNameNS('*', 'ele')[0]?.textContent?.trim();
      const nameText = el.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim();
      const timeText = el.getElementsByTagNameNS('*', 'time')[0]?.textContent?.trim();

      const ele = eleText !== undefined ? Number.parseFloat(eleText) : undefined;

      points.push({
        lat,
        lon,
        ...(ele !== undefined && !Number.isNaN(ele) ? { ele } : {}),
        ...(nameText ? { name: nameText } : {}),
        ...(timeText ? { time: timeText } : {}),
      });
    }

    return points;
  }

  private resolveFilename(rawName?: string): string {
    const base = (rawName ?? 'route')
      .trim()
      .replace(/\.gpx$/i, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return `${base || 'route'}.gpx`;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}