import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL, WAYPOINT_ENDPOINTS } from '../config/api.config';
import { fromBackendCategory, toBackendCategory, WaypointApiService } from './waypoint-api.service';

describe('WaypointApiService', () => {
  let service: WaypointApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WaypointApiService);
    http = TestBed.inject(HttpTestingController);
  });

  it('should convert categories between frontend and backend names', () => {
    expect(toBackendCategory('panoramic view')).toBe('PANORAMIC_VIEW');
    expect(toBackendCategory('peak')).toBe('PEAK');
    expect(fromBackendCategory('PANORAMIC_VIEW')).toBe('panoramic view');
  });

  it('should publish a waypoint, uploading only the photos picked in the browser', () => {
    let result;
    service
      .publish({
        isPublic: false,
<<<<<<< Updated upstream
=======
        name: 'Rifugio Test',
>>>>>>> Stashed changes
        lat: 46,
        lon: 11,
        desc: 'Nice view',
        categories: ['peak', 'panoramic view'],
        photos: ['data:image/png;base64,AAAA', 'http://localhost:8080/api/waypoints/pictures/old.png'],
      })
      .subscribe((wp) => (result = wp));

    const req = http.expectOne(WAYPOINT_ENDPOINTS.waypoints);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
<<<<<<< Updated upstream
=======
      name: 'Rifugio Test',
>>>>>>> Stashed changes
      categories: ['PEAK', 'PANORAMIC_VIEW'],
      description: 'Nice view',
      latitude: 46,
      longitude: 11,
      photos: ['data:image/png;base64,AAAA'],
    });
    req.flush({
      id: 7,
<<<<<<< Updated upstream
=======
      name: 'Rifugio Test',
>>>>>>> Stashed changes
      categories: ['PEAK', 'PANORAMIC_VIEW'],
      description: 'Nice view',
      latitude: 46,
      longitude: 11,
      photos: ['/api/waypoints/pictures/a.png'],
      publisher: 'hiker',
    });

    expect(result).toEqual({
      id: 7,
<<<<<<< Updated upstream
=======
      name: 'Rifugio Test',
>>>>>>> Stashed changes
      lat: 46,
      lon: 11,
      desc: 'Nice view',
      categories: ['peak', 'panoramic view'],
      photos: [`${API_BASE_URL}/api/waypoints/pictures/a.png`],
      publisher: 'hiker',
      isPublic: true,
    });
  });

<<<<<<< Updated upstream
=======
  it('should report a waypoint with a POST to its report endpoint', () => {
    let done = false;
    service.report(5).subscribe(() => (done = true));

    const req = http.expectOne(WAYPOINT_ENDPOINTS.report(5));
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

>>>>>>> Stashed changes
  it('should load the waypoints within the radius of a point as public waypoints', () => {
    let result;
    service.loadNearby({ lat: 45.5, lon: 9.2 }, 200).subscribe((list) => (result = list));

    const req = http.expectOne((r) => r.url === WAYPOINT_ENDPOINTS.nearby);
    expect(req.request.params.get('lat')).toBe('45.5');
    expect(req.request.params.get('lon')).toBe('9.2');
    expect(req.request.params.get('radiusKm')).toBe('200');
<<<<<<< Updated upstream
    req.flush([{ id: 1, categories: ['FOUNTAIN'], description: null, latitude: 45.4, longitude: 9.1, photos: [], publisher: 'bob' }]);

    expect(result).toEqual([
      { id: 1, lat: 45.4, lon: 9.1, desc: undefined, categories: ['fountain'], photos: [], publisher: 'bob', isPublic: true },
=======
    req.flush([{ id: 1, name: 'Fontana', categories: ['FOUNTAIN'], description: null, latitude: 45.4, longitude: 9.1, photos: [], publisher: 'bob' }]);

    expect(result).toEqual([
      { id: 1, lat: 45.4, lon: 9.1, name: 'Fontana', desc: undefined, categories: ['fountain'], photos: [], publisher: 'bob', isPublic: true },
>>>>>>> Stashed changes
    ]);
  });
});
