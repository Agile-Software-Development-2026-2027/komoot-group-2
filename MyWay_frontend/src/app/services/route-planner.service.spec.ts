import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OSRM_ROUTE_URL, RoutePlannerService } from './route-planner.service';
import { GpxExportService } from './gpx-export.service';
import { GpxService } from './gpx.service';

const START = { lat: 41.8902, lon: 12.4922 };
const END = { lat: 41.9029, lon: 12.4534 };
const ROUTE_URL = `${OSRM_ROUTE_URL}/12.4922,41.8902;12.4534,41.9029`;

const OK_RESPONSE = {
  code: 'Ok',
  routes: [
    {
      distance: 4093.9,
      duration: 3276.4,
      geometry: {
        coordinates: [
          [12.4922, 41.8902],
          [12.47, 41.895],
          [12.4534, 41.9029],
        ],
      },
    },
  ],
};

describe('RoutePlannerService', () => {
  let service: RoutePlannerService;
  let http: HttpTestingController;
  let gpxExportService: GpxExportService;
  let notifySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoutePlannerService);
    http = TestBed.inject(HttpTestingController);
    gpxExportService = TestBed.inject(GpxExportService);
    notifySpy = vi.spyOn(TestBed.inject(GpxService), 'showNotification').mockImplementation(() => {});
  });

  afterEach(() => http.verify());

  function selectStartAndEnd() {
    service.selectPoint(START);
    service.selectPoint(END);
    return http.expectOne((req) => req.url === ROUTE_URL);
  }

  it('should set the start on the first click without calling the routing service', () => {
    service.selectPoint(START);

    expect(service.start()).toEqual(START);
    expect(service.end()).toBeNull();
    http.expectNone(() => true);
  });

  it('should calculate the route on the second click and make it exportable', () => {
    const req = selectStartAndEnd();
    expect(service.loading()).toBe(true);
    expect(req.request.params.get('geometries')).toBe('geojson');
    expect(req.request.params.get('overview')).toBe('full');
    expect(req.request.params.get('radiuses')).toBe('1000;1000');

    req.flush(OK_RESPONSE);

    expect(service.loading()).toBe(false);
    expect(service.route()).toEqual({
      points: [
        { lat: 41.8902, lon: 12.4922 },
        { lat: 41.895, lon: 12.47 },
        { lat: 41.9029, lon: 12.4534 },
      ],
      distanceMeters: 4093.9,
      durationSeconds: 3276.4,
    });

    const exported = gpxExportService.route();
    expect(exported.points).toEqual(service.route()!.points);
    expect(exported.waypoints).toEqual([
      { ...START, name: 'Start' },
      { ...END, name: 'Destination' },
    ]);
  });

  it.each([
    ['NoSegment', 'too far from any road'],
    ['NoRoute', 'No route found'],
    ['InvalidValue', 'Could not calculate the route'],
  ])('should show an error message when the routing service answers %s', (code, message) => {
    selectStartAndEnd().flush(
      { code, message: 'details' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(service.loading()).toBe(false);
    expect(service.route()).toBeNull();
    expect(service.start()).toEqual(START);
    expect(service.end()).toEqual(END);
    expect(notifySpy).toHaveBeenCalledWith({
      type: 'error',
      message: expect.stringContaining(message),
    });
  });

  it('should show an error message when the routing service is unreachable', () => {
    selectStartAndEnd().error(new ProgressEvent('error'));

    expect(notifySpy).toHaveBeenCalledWith({
      type: 'error',
      message: expect.stringContaining('unreachable'),
    });
  });

  it('should start a new route on a further click and cancel the pending request', () => {
    const req = selectStartAndEnd();
    const newStart = { lat: 45.46, lon: 9.19 };

    service.selectPoint(newStart);

    expect(req.cancelled).toBe(true);
    expect(service.start()).toEqual(newStart);
    expect(service.end()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should clear the exported route only while it is still the planned one', () => {
    selectStartAndEnd().flush(OK_RESPONSE);
    service.clear();
    expect(gpxExportService.hasRoute()).toBe(false);

    selectStartAndEnd().flush(OK_RESPONSE);
    gpxExportService.setPoints([{ lat: 40, lon: 15 }], 'Uploaded GPX');
    service.clear();
    expect(gpxExportService.route().name).toBe('Uploaded GPX');
  });

  it('should download the planned route as GPX', () => {
    const downloadSpy = vi.spyOn(gpxExportService, 'downloadGpx').mockReturnValue('<gpx></gpx>');
    selectStartAndEnd().flush(OK_RESPONSE);

    service.exportGpx();

    expect(downloadSpy).toHaveBeenCalledWith(undefined, gpxExportService.route());
  });
});
