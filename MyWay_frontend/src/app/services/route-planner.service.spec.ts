import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannedRoute, RoutePlannerService, RoutingResponse } from './route-planner.service';
import { GpxExportService } from './gpx-export.service';
import { GpxService } from './gpx.service';
import { ROUTING_ENDPOINT } from '../config/api.config';

const START = { lat: 41.8902, lon: 12.4922 };
const END = { lat: 41.9029, lon: 12.4534 };

const RESPONSE: RoutingResponse = {
  points: [
    { latitude: 41.8902, longitude: 12.4922 },
    { latitude: 41.895, longitude: 12.47 },
    { latitude: 41.9029, longitude: 12.4534 },
  ],
  distanceMeters: 4093.9,
  durationSeconds: 3684.5,
};

const ROUTE: PlannedRoute = {
  points: [
    { lat: 41.8902, lon: 12.4922 },
    { lat: 41.895, lon: 12.47 },
    { lat: 41.9029, lon: 12.4534 },
  ],
  distanceMeters: 4093.9,
  durationSeconds: 3684.5,
};

describe('RoutePlannerService', () => {
  let service: RoutePlannerService;
  let http: HttpTestingController;
  let gpxExportService: GpxExportService;
  let gpxService: GpxService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoutePlannerService);
    http = TestBed.inject(HttpTestingController);
    gpxExportService = TestBed.inject(GpxExportService);
    gpxService = TestBed.inject(GpxService);
  });

  afterEach(() => http.verify());

  function selectStartAndEnd() {
    service.selectPoint(START);
    service.selectPoint(END);
  }

  function expectRoutingRequest() {
    return http.expectOne((req) => req.url === ROUTING_ENDPOINT);
  }

  /** Selects start and destination and answers the backend request with RESPONSE. */
  function planRoute() {
    selectStartAndEnd();
    expectRoutingRequest().flush(RESPONSE);
  }

  it('should set the start on the first click without calling the backend', () => {
    service.selectPoint(START);

    expect(service.start()).toEqual(START);
    expect(service.end()).toBeNull();
    http.expectNone(() => true);
  });

  it('should ask the backend for the route on the second click', () => {
    selectStartAndEnd();

    const req = expectRoutingRequest();
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('fromLat')).toBe(String(START.lat));
    expect(req.request.params.get('fromLon')).toBe(String(START.lon));
    expect(req.request.params.get('toLat')).toBe(String(END.lat));
    expect(req.request.params.get('toLon')).toBe(String(END.lon));
    expect(service.end()).toEqual(END);
    expect(service.loading()).toBe(true);

    req.flush(RESPONSE);
    expect(service.loading()).toBe(false);
  });

  it('should show the route returned by the backend and make it exportable', () => {
    planRoute();

    expect(service.route()).toEqual(ROUTE);
    const exported = gpxExportService.route();
    expect(exported.points).toEqual(ROUTE.points);
    expect(exported.waypoints).toEqual([
      { ...START, name: 'Start' },
      { ...END, name: 'Destination' },
    ]);
  });

  it('should show the backend error message and keep the points', () => {
    const notifySpy = vi.spyOn(gpxService, 'showNotification');
    selectStartAndEnd();

    const message = 'A selected point is too far from any road or path. Pick a point closer to a road.';
    expectRoutingRequest().flush({ message }, { status: 422, statusText: 'Unprocessable Content' });

    expect(notifySpy).toHaveBeenCalledWith({ type: 'error', message });
    expect(service.loading()).toBe(false);
    expect(service.route()).toBeNull();
    expect(service.start()).toEqual(START);
    expect(service.end()).toEqual(END);
  });

  it('should say the routing service is unreachable when the backend does not answer', () => {
    const notifySpy = vi.spyOn(gpxService, 'showNotification');
    selectStartAndEnd();

    expectRoutingRequest().error(new ProgressEvent('error'), { status: 0 });

    expect(notifySpy).toHaveBeenCalledWith({
      type: 'error',
      message: 'The routing service is unreachable. Check that the backend is running and try again.',
    });
  });

  it('should start a new route on a further click', () => {
    planRoute();
    const newStart = { lat: 45.46, lon: 9.19 };

    service.selectPoint(newStart);

    expect(service.start()).toEqual(newStart);
    expect(service.end()).toBeNull();
    expect(service.route()).toBeNull();
  });

  it('should cancel a pending request when a new route is started', () => {
    selectStartAndEnd();
    const req = expectRoutingRequest();

    service.selectPoint({ lat: 45.46, lon: 9.19 });

    expect(req.cancelled).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('should clear the exported route only while it is still the planned one', () => {
    planRoute();
    service.clear();
    expect(gpxExportService.hasRoute()).toBe(false);

    planRoute();
    gpxExportService.setPoints([{ lat: 40, lon: 15 }], 'Uploaded GPX');
    service.clear();
    expect(gpxExportService.route().name).toBe('Uploaded GPX');
  });

  it('should download the planned route as GPX', () => {
    const downloadSpy = vi.spyOn(gpxExportService, 'downloadGpx').mockReturnValue('<gpx></gpx>');
    planRoute();

    service.exportGpx();

    expect(downloadSpy).toHaveBeenCalledWith(undefined, gpxExportService.route());
  });
});
