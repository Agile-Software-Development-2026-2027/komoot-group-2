export interface GeoPoint {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6371008.8;
const DEG_TO_RAD = Math.PI / 180;

/** Converts a point to meters (x east, y north) relative to an origin: accurate enough for short distances */
function toLocalMeters(p: GeoPoint, origin: GeoPoint): { x: number; y: number } {
  return {
    x: (p.lon - origin.lon) * DEG_TO_RAD * Math.cos(origin.lat * DEG_TO_RAD) * EARTH_RADIUS_M,
    y: (p.lat - origin.lat) * DEG_TO_RAD * EARTH_RADIUS_M,
  };
}

/** Minimum distance in meters from a point to the whole polyline (all consecutive segments) */
export function distanceToPolylineMeters(point: GeoPoint, route: GeoPoint[]): number {
  if (route.length === 0) return Infinity;

  let min = Infinity;
  // The point is the origin (0,0); each segment is A -> B in meters around it
  let a = toLocalMeters(route[0], point);
  if (route.length === 1) return Math.hypot(a.x, a.y);

  for (let i = 1; i < route.length; i++) {
    const b = toLocalMeters(route[i], point);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    // t = position of the closest point on the segment (0 = A, 1 = B)
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lenSq));
    const d = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (d < min) min = d;
    a = b;
  }
  return min;
}