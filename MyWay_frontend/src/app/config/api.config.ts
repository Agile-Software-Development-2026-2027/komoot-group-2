/** Base URL of the MyWay backend (Spring Boot). */
export const API_BASE_URL = 'http://localhost:8080';

/** Backend authentication endpoints. */
export const AUTH_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
} as const;

/** True when the request targets our backend (and not a third-party API such as OSRM or Open-Meteo). */
export function isBackendUrl(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`);
}
