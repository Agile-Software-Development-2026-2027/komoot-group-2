/** Base URL of the MyWay backend (Spring Boot). */
export const API_BASE_URL = 'http://localhost:8080';

/** Backend authentication endpoints. */
export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
} as const;

/** Backend waypoint endpoints. */
export const WAYPOINT_ENDPOINTS = {
  /** POST publishes a waypoint (login required). */
  waypoints: `${API_BASE_URL}/api/waypoints`,
  /** GET ?lat=&lon=&radiusKm= returns the public waypoints around a point. */
  nearby: `${API_BASE_URL}/api/waypoints/nearby`,
} as const;
/** Backend route endpoints. */
export const ROUTE_ENDPOINTS = {
  publish: `${API_BASE_URL}/api/routes/publish`,
  publicList: `${API_BASE_URL}/api/routes/public`,
  search: `${API_BASE_URL}/api/routes/search`,
  nearby: `${API_BASE_URL}/api/routes/nearby`,
  mine: `${API_BASE_URL}/api/routes/mine`,
  publicDetails: (id: number) => `${API_BASE_URL}/api/routes/public/${id}`,
  report: (id: number) => `${API_BASE_URL}/api/routes/${id}/report`,
} as const;

/** GET ?fromLat=&fromLon=&toLat=&toLon= returns the walking route between two points. */
export const ROUTING_ENDPOINT = `${API_BASE_URL}/api/routing`;

/** True when the request targets our backend (and not a third-party API such as Open-Meteo). */
export function isBackendUrl(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`);
}
