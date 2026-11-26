import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ROUTE_ENDPOINTS } from '../config/api.config';
import { RouteCategory, RouteDifficulty } from './gpx.service';
import type { LatLon } from './route-planner.service';

/** Radius used to load the public routes around the user. */
export const NEARBY_ROUTES_RADIUS_KM = 100;

export interface PublishRouteRequest {
  name: string;
  category: RouteCategory;
  difficulty: RouteDifficulty;
  isPublic: boolean;
  distanceMeters: number;
  durationSeconds: number;
  gpxFile: File;
  picture?: File | null;
}

/** Route data returned by the backend (never contains emails or file paths). */
export interface PublishedRoute {
  id: number;
  name: string;
  category: string;
  difficulty: string;
  distanceMeters: number | null;
  estimatedTimeInMinutes: number | null;
  publisherUsername: string;
  pictureUrl: string | null;
  publicRoute: boolean;
  reported: boolean;
}

/** A public route near the user: light data for the map, without the track points. */
export interface NearbyRoute {
  id: number;
  name: string;
  category: string;
  difficulty: string;
  distanceMeters: number | null;
  estimatedTimeInMinutes: number | null;
  publisherUsername: string;
  pictureUrl: string | null;
  startLatitude: number;
  startLongitude: number;
  distanceFromUserKm: number;
}

/** A point of a route, as returned by the backend. */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
  name: string | null;
}

export interface RouteDetails {
  route: PublishedRoute;
  points: RoutePoint[];
}

@Injectable({ providedIn: 'root' })
export class RoutePublishingService {
  private readonly http = inject(HttpClient);

  /** The backend uses MEDIUM where the UI says "intermediate" */
  private toBackendDifficulty(difficulty: RouteDifficulty): string {
    return difficulty === 'intermediate' ? 'MEDIUM' : difficulty.toUpperCase();
  }

  /**
   * Sends the route as multipart FormData.
   * The Content-Type header is not set by hand: the browser adds the multipart boundary.
   */
  publishRoute(request: PublishRouteRequest): Observable<PublishedRoute> {
    const form = new FormData();
    form.append('name', request.name);
    form.append('category', request.category.toUpperCase());
    form.append('difficulty', this.toBackendDifficulty(request.difficulty));
    form.append('isPublic', String(request.isPublic));
    form.append('distanceMeters', String(Math.round(request.distanceMeters)));
    form.append('estimatedTimeInMinutes', String(Math.round(request.durationSeconds / 60)));
    form.append('gpxFile', request.gpxFile);
    if (request.picture) {
      form.append('picture', request.picture);
    }
    return this.http.post<PublishedRoute>(ROUTE_ENDPOINTS.publish, form);
  }

  getPublicRoutes(): Observable<PublishedRoute[]> {
    return this.http.get<PublishedRoute[]>(ROUTE_ENDPOINTS.publicList);
  }

  /** Visible public routes whose name matches the search query (case-insensitive). */
  searchPublicRoutes(query: string): Observable<PublishedRoute[]> {
    const params = new HttpParams().set('q', query.trim());
    return this.http.get<PublishedRoute[]>(ROUTE_ENDPOINTS.search, { params });
  }

  getPublicRouteById(id: number): Observable<RouteDetails> {
    return this.http.get<RouteDetails>(ROUTE_ENDPOINTS.publicDetails(id));
  }

  /** Public routes whose start point is within radiusKm of a position (nearest first). */
  getNearbyRoutes(center: LatLon, radiusKm = NEARBY_ROUTES_RADIUS_KM): Observable<NearbyRoute[]> {
    const params = new HttpParams()
      .set('lat', center.lat)
      .set('lon', center.lon)
      .set('radiusKm', radiusKm);
    return this.http.get<NearbyRoute[]>(ROUTE_ENDPOINTS.nearby, { params });
  }

  reportRoute(id: number): Observable<void> {
    return this.http.post<void>(ROUTE_ENDPOINTS.report(id), null);
  }

  getMyRoutes(): Observable<PublishedRoute[]> {
    return this.http.get<PublishedRoute[]>(ROUTE_ENDPOINTS.mine);
  }
}