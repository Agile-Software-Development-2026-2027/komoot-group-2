import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ROUTING_ENDPOINT } from '../config/api.config';
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

export const ROUTE_NAME = 'MyWay Route';

/** Route as the backend sends it (RoutingResponseDTO). */
export interface RoutingResponse {
  points: { latitude: number; longitude: number }[];
  distanceMeters: number;
  durationSeconds: number;
}

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
   * destination and asks the backend for the route, a further click starts a new route.
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

  /** Shows a route between the selected points and makes it exportable as GPX. */
  setRoute(route: PlannedRoute): void {
    const start = this.start();
    const end = this.end();
    this.route.set(route);

    this.gpxExportService.setRoute({
      name: ROUTE_NAME,
      points: route.points,
      waypoints: [
        ...(start ? [{ ...start, name: 'Start' }] : []),
        ...(end ? [{ ...end, name: 'Destination' }] : []),
      ],
    });
    this.routeData = this.gpxExportService.route();
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
    const params = new HttpParams()
      .set('fromLat', start.lat)
      .set('fromLon', start.lon)
      .set('toLat', end.lat)
      .set('toLon', end.lon);

    this.loading.set(true);
    this.request = this.http.get<RoutingResponse>(ROUTING_ENDPOINT, { params }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.setRoute({
          points: response.points.map(({ latitude, longitude }) => ({ lat: latitude, lon: longitude })),
          distanceMeters: response.distanceMeters,
          durationSeconds: response.durationSeconds,
        });
      },
      // The points stay on the map so the user sees what failed; the next click starts over
      error: (err: unknown) => {
        this.loading.set(false);
        this.gpxService.showNotification({ type: 'error', message: routingErrorMessage(err) });
      },
    });
  }
}

/** The backend explains routing failures (point too far from a road, no route, ...) in ErrorResponse.message. */
function routingErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 0) {
    return 'The routing service is unreachable. Check that the backend is running and try again.';
  }
  const message = err instanceof HttpErrorResponse ? (err.error as { message?: unknown } | null)?.message : null;
  return typeof message === 'string' && message ? message : 'Could not calculate the route. Please try again.';
}
