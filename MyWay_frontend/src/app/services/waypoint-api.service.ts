import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL, WAYPOINT_ENDPOINTS } from '../config/api.config';
import type { GpxWaypoint, WaypointCategory } from './gpx.service';
import type { LatLon } from './route-planner.service';

/** Radius used to load the public waypoints around the user. */
export const NEARBY_RADIUS_KM = 200;

/** Waypoint as the backend sends it (WaypointDTO). */
interface WaypointResponse {
  id: number;
  categories: string[];
  name?: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  photos: string[];
  publisher: string;
  /** Only present in "near a track" results. */
  distanceMeters?: number;
}

/** Frontend category ('panoramic view') <-> backend enum (PANORAMIC_VIEW). */
export function toBackendCategory(category: WaypointCategory): string {
  return category.toUpperCase().replace(/ /g, '_');
}

export function fromBackendCategory(category: string): WaypointCategory {
  return category.toLowerCase().replace(/_/g, ' ') as WaypointCategory;
}

@Injectable({
  providedIn: 'root',
})
export class WaypointApiService {
  private readonly http = inject(HttpClient);

  /** Saves the waypoint on the backend as a public one (the user must be logged in). */
  publish(wp: GpxWaypoint): Observable<GpxWaypoint> {
    const body = {
      categories: (wp.categories ?? []).map(toBackendCategory),
      name: wp.name?.trim() || null,
      description: wp.desc ?? '',
      latitude: wp.lat,
      longitude: wp.lon,
      // Only the photos picked in this browser (data URLs) need uploading
      photos: (wp.photos ?? []).filter((photo) => photo.startsWith('data:')),
    };
    return this.http.post<WaypointResponse>(WAYPOINT_ENDPOINTS.waypoints, body).pipe(map(toGpxWaypoint));
  }

  /** Public waypoints within radiusKm of a point. */
  loadNearby(center: LatLon, radiusKm = NEARBY_RADIUS_KM): Observable<GpxWaypoint[]> {
    const params = new HttpParams()
      .set('lat', center.lat)
      .set('lon', center.lon)
      .set('radiusKm', radiusKm);
    return this.http
      .get<WaypointResponse[]>(WAYPOINT_ENDPOINTS.nearby, { params })
      .pipe(map((list) => list.map(toGpxWaypoint)));
  }

  /** Public waypoints within 1 km of a published public route (403 if the caller is its publisher). */
  loadNearPublicRoute(routeId: number): Observable<GpxWaypoint[]> {
    return this.http
      .get<WaypointResponse[]>(`${API_BASE_URL}/api/routes/public/${routeId}/waypoints`)
      .pipe(map((list) => list.map(toGpxWaypoint)));
  }
}

export function toGpxWaypoint(w: WaypointResponse): GpxWaypoint {
  return {
    id: w.id,
    lat: w.latitude,
    lon: w.longitude,
    name: w.name ?? undefined,
    desc: w.description ?? undefined,
    categories: w.categories.map(fromBackendCategory),
    photos: w.photos.map((url) => (url.startsWith('/') ? `${API_BASE_URL}${url}` : url)),
    publisher: w.publisher,
    isPublic: true,
    distanceMeters: w.distanceMeters,
  };
}
