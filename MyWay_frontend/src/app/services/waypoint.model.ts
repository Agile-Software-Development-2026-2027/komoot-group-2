import { WaypointCategory } from './gpx.service';

/** Maximum distance between a waypoint and the route to be shown (may change after the PO decision) */
export const MAX_WAYPOINT_DISTANCE_METERS = 1000;

/** ⚠️ MOCK: replace with the real logged-in user when the Backend exists */
export const CURRENT_USER = 'me';
/** ⚠️ MOCK: every loaded GPX route is treated as published by this user. Set it to CURRENT_USER to test "own route" */
export const MOCK_ROUTE_PUBLISHER = 'other-user';

/** Waypoint published by a MyWay user (different from GpxWaypoint, which comes from a GPX file) */
export interface PlatformWaypoint {
  id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  category: WaypointCategory; // reused from gpx.service.ts, not defined twice
  photos?: string[];
  publisher: string;
  isPublic: boolean;
  isReported: boolean;
}