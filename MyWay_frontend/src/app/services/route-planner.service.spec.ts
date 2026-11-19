import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannedRoute, RoutePlannerService } from './route-planner.service';
import { GpxExportService } from './gpx-export.service';

const START = { lat: 41.8902, lon: 12.4922 };
const END = { lat: 41.9029, lon: 12.4534 };

const ROUTE: PlannedRoute = {
  points: [
    { lat: 41.8902, lon: 12.4922 },
    { lat: 41.895, lon: 12.47 },
    { lat: 41.9029, lon: 12.4534 },
  ],
  distanceMeters: 4093.9,
  durationSeconds: 3276.4,
};

describe('RoutePlannerService', () => {
  let service: RoutePlannerService;
  let http: HttpTestingController;
  let gpxExportService: GpxExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoutePlannerService);
    http = TestBed.inject(HttpTestingController);
    gpxExportService = TestBed.inject(GpxExportService);
  });

  afterEach(() => http.verify());

  function selectStartAndEnd() {
    service.selectPoint(START);
    service.selectPoint(END);
  }

  it('should set the start on the first click', () => {
    service.selectPoint(START);

    expect(service.start()).toEqual(START);
    expect(service.end()).toBeNull();
  });

  it('should set the destination on the second click without calling any external service', () => {
    selectStartAndEnd();

    expect(service.start()).toEqual(START);
    expect(service.end()).toEqual(END);
    expect(service.route()).toBeNull();
    http.expectNone(() => true);
  });

  it('should start a new route on a further click', () => {
    selectStartAndEnd();
    service.setRoute(ROUTE);
    const newStart = { lat: 45.46, lon: 9.19 };

    service.selectPoint(newStart);

    expect(service.start()).toEqual(newStart);
    expect(service.end()).toBeNull();
    expect(service.route()).toBeNull();
  });

  it('should show a route handed over with setRoute and make it exportable', () => {
    selectStartAndEnd();
    service.setRoute(ROUTE);

    expect(service.route()).toEqual(ROUTE);
    const exported = gpxExportService.route();
    expect(exported.points).toEqual(ROUTE.points);
    expect(exported.waypoints).toEqual([
      { ...START, name: 'Start' },
      { ...END, name: 'Destination' },
    ]);
  });

  it('should clear the exported route only while it is still the planned one', () => {
    selectStartAndEnd();
    service.setRoute(ROUTE);
    service.clear();
    expect(gpxExportService.hasRoute()).toBe(false);

    selectStartAndEnd();
    service.setRoute(ROUTE);
    gpxExportService.setPoints([{ lat: 40, lon: 15 }], 'Uploaded GPX');
    service.clear();
    expect(gpxExportService.route().name).toBe('Uploaded GPX');
  });

  it('should download the planned route as GPX', () => {
    const downloadSpy = vi.spyOn(gpxExportService, 'downloadGpx').mockReturnValue('<gpx></gpx>');
    selectStartAndEnd();
    service.setRoute(ROUTE);

    service.exportGpx();

    expect(downloadSpy).toHaveBeenCalledWith(undefined, gpxExportService.route());
  });
});
