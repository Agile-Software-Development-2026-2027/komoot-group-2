import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SidebarService } from './sidebar.service';
import { OPEN_METEO_ELEVATION_URL } from './elevation.service';
import { GpxService, GpxTrack } from './gpx.service';
import { PlannedRoute, RoutePlannerService } from './route-planner.service';

const PLANNED_ROUTE: PlannedRoute = {
  points: [
    { lat: 41.89, lon: 12.49 },
    { lat: 41.9, lon: 12.45 },
  ],
  distanceMeters: 4093.9,
  durationSeconds: 3276.4,
};

function trackWithoutElevation(): GpxTrack {
  return { name: 'Flat file', segments: [{ points: [[45.1, 7.1], [45.2, 7.2]] }] };
}

describe('SidebarService', () => {
  let service: SidebarService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SidebarService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectElevationRequest() {
    return http.expectOne((req) => req.url === OPEN_METEO_ELEVATION_URL);
  }

  it('should start closed with no route selected', () => {
    expect(service.isOpen()).toBe(false);
    expect(service.selectedRoute()).toBeNull();
  });

  it('should open on a GPX track and use the elevations stored in the file', () => {
    const track: GpxTrack = {
      segments: [{ points: [[45, 7], [45.1, 7.1], [45.2, 7.2]], elevations: [1000, 1250, 1100] }],
    };

    service.showTrack(track, []);

    expect(service.isOpen()).toBe(true);
    expect(service.selectedRoute()).toEqual({ kind: 'gpx', track, waypoints: [] });
    expect(service.elevation()).toEqual({
      status: 'ready',
      source: 'gpx',
      stats: { maxMeters: 1250, minMeters: 1000, ascentMeters: 250, descentMeters: 150 },
    });
    http.expectNone(() => true);
  });

  it('should look up the elevation of a GPX track without it, only once per track', () => {
    const track = trackWithoutElevation();

    service.showTrack(track);
    expect(service.elevation().status).toBe('loading');
    expectElevationRequest().flush({ elevation: [300, 420] });

    expect(service.elevation()).toEqual({
      status: 'ready',
      source: 'open-meteo',
      stats: { maxMeters: 420, minMeters: 300, ascentMeters: 120, descentMeters: 0 },
    });

    service.showTrack(track);
    expect(service.elevation().status).toBe('ready');
    http.expectNone(() => true);
  });

  it('should mark the elevation as unavailable when the lookup fails', () => {
    service.showTrack(trackWithoutElevation());
    expectElevationRequest().flush('Server error', { status: 500, statusText: 'Server Error' });

    expect(service.elevation()).toEqual({ status: 'unavailable' });
  });

  it('should show a newly created route and drop it once the route is cleared', () => {
    const routePlanner = TestBed.inject(RoutePlannerService);

    routePlanner.route.set(PLANNED_ROUTE);
    TestBed.tick();

    expect(service.isOpen()).toBe(true);
    expect(service.selectedRoute()).toEqual({ kind: 'planned', route: PLANNED_ROUTE });
    expectElevationRequest().flush({ elevation: [20, 35] });
    expect(service.elevation().status).toBe('ready');

    routePlanner.clear();
    TestBed.tick();

    expect(service.selectedRoute()).toBeNull();
    expect(service.elevation()).toEqual({ status: 'idle' });
  });

  it('should drop the selected GPX track when another file is loaded', async () => {
    service.showTrack(trackWithoutElevation());
    expectElevationRequest().flush({ elevation: [] });

    const gpx = '<gpx><wpt lat="45" lon="7"><name>Other file</name></wpt></gpx>';
    await TestBed.inject(GpxService).loadGpxFile(new File([gpx], 'other.gpx'));

    expect(service.selectedRoute()).toBeNull();
  });
});
