/** Base URL of the MyWay backend (Spring Boot). */
export const API_BASE_URL = 'http://localhost:8080';

/** Backend authentication endpoints. */
export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
} as const;

/** Backend route endpoints. */
export const ROUTE_ENDPOINTS = {
  publish: `${API_BASE_URL}/api/routes/publish`,
  publicList: `${API_BASE_URL}/api/routes/public`,
  mine: `${API_BASE_URL}/api/routes/mine`,
  publicDetails: (id: number) => `${API_BASE_URL}/api/routes/public/${id}`,
  report: (id: number) => `${API_BASE_URL}/api/routes/${id}/report`,
} as const;

/** True when the request targets our backend (and not a third-party API such as OSRM or Open-Meteo). */
export function isBackendUrl(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`);
}
