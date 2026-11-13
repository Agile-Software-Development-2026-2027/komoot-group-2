import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CURRENT_USER, PlatformWaypoint } from './waypoint.model';

/** ⚠️ MOCK DATA: around the destination of the green GPX route (41.6215, 13.3075) */
const MOCK_WAYPOINTS: PlatformWaypoint[] = [
  // Near (< 1 km) + public -> shown
  { id: 1, name: 'Fontana del Colle', description: 'Fresh drinking water.', latitude: 41.6245, longitude: 13.3105, category: 'fountain', publisher: 'anna', isPublic: true, isReported: false },
  { id: 2, name: 'Cima Piccola', description: 'Small peak with a nice view.', latitude: 41.6190, longitude: 13.3030, category: 'peak', publisher: 'marco', isPublic: true, isReported: false },
  // Near but private -> hidden from others
  { id: 3, name: 'Private shelter', description: 'Private point.', latitude: 41.6230, longitude: 13.3120, category: 'shelter', publisher: 'luca', isPublic: false, isReported: false },
  // Near but reported -> hidden from others
  { id: 4, name: 'Reported sanctuary', description: 'Reported by users.', latitude: 41.6200, longitude: 13.3150, category: 'sanctuary', publisher: 'sara', isPublic: true, isReported: true },
  // Near, reported, published by the current user -> the publisher still sees it
  { id: 5, name: 'My reported view', description: 'Published by me.', latitude: 41.6225, longitude: 13.3040, category: 'panoramic view', publisher: CURRENT_USER, isPublic: true, isReported: true },
  // Far (> 1 km) -> hidden by the distance filter
  { id: 6, name: 'Far panoramic view', description: 'Too far.', latitude: 41.66, longitude: 13.35, category: 'panoramic view', publisher: 'anna', isPublic: true, isReported: false },
  { id: 7, name: 'Far sanctuary', description: 'Too far.', latitude: 41.58, longitude: 13.25, category: 'sanctuary', publisher: 'marco', isPublic: true, isReported: false },
];

@Injectable({ providedIn: 'root' })
export class WaypointService {
  /** Returns Observable so it can be replaced later by an HttpClient call without changing the callers */
  getWaypoints(): Observable<PlatformWaypoint[]> {
    return of(MOCK_WAYPOINTS);
  }

  /** Frontend filter only (not security): the Backend will enforce the real rules */
  isVisibleToUser(wp: PlatformWaypoint, user: string): boolean {
    if (wp.publisher === user) return true;
    return wp.isPublic && !wp.isReported;
  }
}