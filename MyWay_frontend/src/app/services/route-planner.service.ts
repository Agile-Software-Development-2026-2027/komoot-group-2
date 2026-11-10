import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { GpxExportService, RouteData } from './gpx-export.service';
import { GpxService } from './gpx.service';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface PlannedRoute {
  points: LatLon[];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Public OSRM server run by FOSSGIS on OpenStreetMap data (no API key, CORS enabled).
 * Usage policy: https://routing.openstreetmap.de/about.html (attribution, max 1 request/s).
 */
export const OSRM_ROUTE_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

/** Points farther than this from a road or path fail with NoSegment instead of being snapped. */
const MAX_SNAP_DISTANCE_METERS = 1000;

export const ROUTE_NAME = 'MyWay Route';

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] }; // [lon, lat]
  }[];
}

const OSRM_ERROR_MESSAGES: Record<string, string> = {
  NoSegment: 'A selected point is too far from any road or path. Pick a point closer to a road.',
  NoRoute: 'No route found between the selected points.',
};

@Injectable({
  providedIn: 'root',
})
export class RoutePlannerService {
  private readonly http = inject(HttpClient);
  private readonly gpxExportService = inject(GpxExportService);
  private readonly gpxService = inject(GpxService);

  readonly start = signal<LatLon | null>(null);
  readonly end = signal<LatLon | null>(null);
  readonly route = signal<PlannedRoute | null>(null);
  readonly loading = signal(false);

  private request?: Subscription;
  /** The planned route as handed to GpxExportService, used for export and clearing. */
  private routeData?: RouteData;

  /**
   * Handles a click on the map: the first click sets the start, the second sets the
   * destination and calculates the route, a further click starts a new route.
   */
  selectPoint(point: LatLon): void {
    const start = this.start();
    if (!start || this.end()) {
      this.clear();
      this.start.set(point);
      return;
    }
    this.end.set(point);
    this.calculateRoute(start, point);
  }

  /** Removes the points and the route, and cancels a pending request. */
  clear(): void {
    this.request?.unsubscribe();
    this.loading.set(false);
    this.start.set(null);
    this.end.set(null);
    this.route.set(null);

    // Only clear the exportable route if it is still ours (not a GPX loaded afterwards)
    if (this.routeData && this.gpxExportService.route() === this.routeData) {
      this.gpxExportService.clearRoute();
    }
    this.routeData = undefined;
  }

  /** Downloads the planned route as a GPX file. */
  exportGpx(): void {
    if (this.routeData) {
      this.gpxExportService.downloadGpx(undefined, this.routeData);
    }
  }

  private calculateRoute(start: LatLon, end: LatLon): void {
    const coordinates = `${start.lon},${start.lat};${end.lon},${end.lat}`;
    const params = {
      overview: 'full',
      geometries: 'geojson',
      radiuses: `${MAX_SNAP_DISTANCE_METERS};${MAX_SNAP_DISTANCE_METERS}`,
    };

    this.loading.set(true);
    this.request = this.http
      .get<OsrmResponse>(`${OSRM_ROUTE_URL}/${coordinates}`, { params })
      .subscribe({
        next: (response) => this.onResponse(response, start, end),
        error: (err: unknown) => this.onError(err),
      });
  }

  private onResponse(response: OsrmResponse, start: LatLon, end: LatLon): void {
    const best = response.routes?.[0];
    if (response.code !== 'Ok' || !best) {
      this.onError(response);
      return;
    }

    const points = best.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
    this.route.set({ points, distanceMeters: best.distance, durationSeconds: best.duration });

    this.gpxExportService.setRoute({
      name: ROUTE_NAME,
      points,
      waypoints: [
        { ...start, name: 'Start' },
        { ...end, name: 'Destination' },
      ],
    });
    this.routeData = this.gpxExportService.route();
    this.loading.set(false);
  }

  /** The points stay on the map so the user sees what failed; the next click starts over. */
  private onError(err: unknown): void {
    this.loading.set(false);
    this.gpxService.showNotification({ type: 'error', message: this.errorMessage(err) });
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 0) {
      return 'The routing service is unreachable. Check your connection and try again.';
    }
    const body = err instanceof HttpErrorResponse ? err.error : err;
    const code = (body as Partial<OsrmResponse> | null)?.code;
    return (code && OSRM_ERROR_MESSAGES[code]) || 'Could not calculate the route. Please try again.';
  }
}
