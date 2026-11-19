import { Injectable, inject, signal } from '@angular/core';
import { GpxExportService, RouteData } from './gpx-export.service';

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

@Injectable({
  providedIn: 'root',
})
export class RoutePlannerService {
  private readonly gpxExportService = inject(GpxExportService);

  readonly start = signal<LatLon | null>(null);
  readonly end = signal<LatLon | null>(null);
  readonly route = signal<PlannedRoute | null>(null);

  /** The planned route as handed to GpxExportService, used for export and clearing. */
  private routeData?: RouteData;

  /**
   * Handles a click on the map: the first click sets the start, the second sets the
   * destination, a further click starts a new route.
   * The route between the two points is not calculated here: it is handed over with setRoute().
   */
  selectPoint(point: LatLon): void {
    if (!this.start() || this.end()) {
      this.clear();
      this.start.set(point);
      return;
    }
    this.end.set(point);
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

  /** Removes the points and the route. */
  clear(): void {
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
}
