import { Injectable } from '@angular/core';
import type { LatLon } from './route-planner.service';

/** Center of Italy: used when the user's position is not available. */
export const ITALY_CENTER: LatLon = { lat: 42.5, lon: 12.5 };

export interface UserLocation {
  position: LatLon;
  /** True when the real position could not be read and ITALY_CENTER is used instead. */
  isFallback: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  /**
   * Asks the browser for the user's position (this shows the permission prompt).
   * Never rejects: if the permission is denied, times out or is unsupported, the center of Italy is returned.
   */
  getUserLocation(): Promise<UserLocation> {
    const fallback: UserLocation = { position: ITALY_CENTER, isFallback: true };
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return Promise.resolve(fallback);
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ position: { lat: pos.coords.latitude, lon: pos.coords.longitude }, isFallback: false }),
        () => resolve(fallback),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    });
  }
}
