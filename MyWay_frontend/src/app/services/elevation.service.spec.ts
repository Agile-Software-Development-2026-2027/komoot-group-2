import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ElevationService, MAX_ELEVATION_POINTS, OPEN_METEO_ELEVATION_URL } from './elevation.service';

describe('ElevationService', () => {
  let service: ElevationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ElevationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should request the elevation of every point of a short path', () => {
    let result: (number | null)[] | undefined;
    service
      .getElevationProfile([
        { lat: 45.83264, lon: 6.86517 },
        { lat: 41.9, lon: 12.5 },
      ])
      .subscribe((profile) => (result = profile));

    const req = http.expectOne((r) => r.url === OPEN_METEO_ELEVATION_URL);
    expect(req.request.params.get('latitude')).toBe('45.83264,41.90000');
    expect(req.request.params.get('longitude')).toBe('6.86517,12.50000');
    req.flush({ elevation: [4792, 58] });

    expect(result).toEqual([4792, 58]);
  });

  it('should sample long paths down to one request', () => {
    const path = Array.from({ length: 1000 }, (_, i) => ({ lat: 45 + i / 1000, lon: 7 }));
    service.getElevationProfile(path).subscribe();

    const req = http.expectOne((r) => r.url === OPEN_METEO_ELEVATION_URL);
    const latitudes = req.request.params.get('latitude')!.split(',');
    expect(latitudes).toHaveLength(MAX_ELEVATION_POINTS);
    expect(latitudes[0]).toBe('45.00000');
    expect(latitudes.at(-1)).toBe('45.99900');
    req.flush({ elevation: [] });
  });
});
