import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GeocodingService, OPEN_METEO_GEOCODING_URL } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GeocodingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should return an empty list without calling the API for queries shorter than 2 characters', () => {
    let result: unknown;
    service.searchPlaces('a').subscribe((places) => (result = places));

    expect(result).toEqual([]);
    http.expectNone(() => true);
  });

  it('should prioritize Italian places and format subtitles cleanly', () => {
    let places: ReturnType<typeof Array.prototype.slice> = [];
    service.searchPlaces('Napoli').subscribe((res) => (places = res));

    const req = http.expectOne((r) => r.url === OPEN_METEO_GEOCODING_URL);
    expect(req.request.params.get('name')).toBe('Napoli');
    req.flush({
      results: [
        { id: 1, name: 'Naples', latitude: 26.14, longitude: -81.79, country_code: 'US', admin1: 'Florida', country: 'United States' },
        { id: 2, name: 'Naples', latitude: 40.85, longitude: 14.27, country_code: 'IT', admin1: 'Campania', country: 'Italy' },
      ],
    });

    expect(places).toEqual([
      { id: 2, name: 'Naples', latitude: 40.85, longitude: 14.27, subtitle: 'Campania, Italy' },
      { id: 1, name: 'Naples', latitude: 26.14, longitude: -81.79, subtitle: 'Florida, United States' },
    ]);
  });
});
