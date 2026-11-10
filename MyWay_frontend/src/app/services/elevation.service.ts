import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { sampleEvenly } from '../utils/route-stats';
import type { LatLon } from './route-planner.service';

/**
 * Open-Meteo elevation API (Copernicus DEM GLO-90, no API key, CORS enabled).
 * Data licensed CC BY 4.0, attribution required: https://open-meteo.com/en/license
 */
export const OPEN_METEO_ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation';

/** The API accepts at most 100 coordinates per request. */
export const MAX_ELEVATION_POINTS = 100;

interface OpenMeteoElevationResponse {
  elevation: (number | null)[];
}

@Injectable({
  providedIn: 'root',
})
export class ElevationService {
  private readonly http = inject(HttpClient);

  /**
   * Looks up the terrain elevation (metres) along a path, sampling at most
   * MAX_ELEVATION_POINTS points evenly so the whole path fits in one request.
   */
  getElevationProfile(path: readonly LatLon[]): Observable<(number | null)[]> {
    const samples = sampleEvenly(path, MAX_ELEVATION_POINTS);
    const params = {
      latitude: samples.map((p) => p.lat.toFixed(5)).join(','),
      longitude: samples.map((p) => p.lon.toFixed(5)).join(','),
    };

    return this.http
      .get<OpenMeteoElevationResponse>(OPEN_METEO_ELEVATION_URL, { params })
      .pipe(map((response) => response.elevation ?? []));
  }
}
