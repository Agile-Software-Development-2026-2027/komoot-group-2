import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FOLDER_ENDPOINTS } from '../config/api.config';

export interface Folder {
  id: number;
  name: string;
}

export interface SavedRoutePoint {
  latitude: number;
  longitude: number;
  elevation: number | null;
}

export interface SavedRoute {
  id: number;
  name: string;
  folderId?: number;
  /** Id of the Route (published, public or private) this saved route points to. */
  route?: { id: number };
  /** Track points, only returned when a single saved route is requested. */
  points?: SavedRoutePoint[];
}

/** Folders of the logged-in user and the routes saved in them. The user is identified by the JWT. */
@Injectable({ providedIn: 'root' })
export class SavedRoutesService {
  private readonly http = inject(HttpClient);

  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(FOLDER_ENDPOINTS.folders);
  }

  createFolder(name: string): Observable<Folder> {
    return this.http.post<Folder>(FOLDER_ENDPOINTS.folders, null, { params: new HttpParams().set('name', name) });
  }

  getRoutes(folderId: number): Observable<SavedRoute[]> {
    return this.http.get<SavedRoute[]>(FOLDER_ENDPOINTS.savedRoutes, {
      params: new HttpParams().set('folderId', folderId),
    });
  }

  getRoute(id: number): Observable<SavedRoute> {
    return this.http.get<SavedRoute>(`${FOLDER_ENDPOINTS.savedRoutes}/${id}`);
  }

  /** Saves an existing Route (own or public) in a folder. */
  saveRoute(folderId: number, name: string, routeId: number, waypointIds: number[] = []): Observable<SavedRoute> {
    return this.http.post<SavedRoute>(FOLDER_ENDPOINTS.savedRoutes, { folderId, name, routeId, waypointIds });
  }
}
