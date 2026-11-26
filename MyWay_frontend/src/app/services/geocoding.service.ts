import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

/**
 * Open-Meteo Geocoding API (no API key, CORS enabled, designed for place autocomplete).
 */
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface PlaceResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  /** Administrative area and country, e.g. "Campania, Italy" */
  subtitle: string;
}

interface OpenMeteoGeocodingItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingItem[];
}

const MIN_QUERY_LENGTH = 2;
const MAX_PLACE_RESULTS = 5;

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  /** Looks up places matching the text, prioritizing Italian locations first. */
  searchPlaces(query: string): Observable<PlaceResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return of([]);
    }

    const params = new HttpParams()
      .set('name', trimmed)
      .set('count', '8')
      .set('language', 'en')
      .set('format', 'json');

    return this.http.get<OpenMeteoGeocodingResponse>(OPEN_METEO_GEOCODING_URL, { params }).pipe(
      map((response) => {
        const items = response.results ?? [];
        const prioritized = [
          ...items.filter((item) => item.country_code === 'IT'),
          ...items.filter((item) => item.country_code !== 'IT'),
        ];

        return prioritized.slice(0, MAX_PLACE_RESULTS).map((item) => {
          const parts = [item.admin1, item.country].filter((p): p is string => !!p && p !== item.name);
          return {
            id: item.id,
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            subtitle: parts.join(', '),
          };
        });
      }),
    );
  }
}
