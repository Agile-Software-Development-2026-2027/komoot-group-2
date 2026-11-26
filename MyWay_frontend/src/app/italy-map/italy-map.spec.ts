import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as L from 'leaflet';

import { ItalyMap } from './italy-map';
import { WAYPOINT_ENDPOINTS } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { GpxService, type GpxWaypoint } from '../services/gpx.service';
import { ITALY_CENTER } from '../services/location.service';
import { RoutePlannerService } from '../services/route-planner.service';
import { SidebarService } from '../services/sidebar.service';
import { TrackStyleHandler } from '../services/track-style-handler.service';

describe('ItalyMap', () => {
  let component: ItalyMap;
  let fixture: ComponentFixture<ItalyMap>;
  let routePlanner: RoutePlannerService;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItalyMap],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ItalyMap);
    component = fixture.componentInstance;
    routePlanner = TestBed.inject(RoutePlannerService);
    host = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function clickMap(lat: number, lng: number): void {
    (component as unknown as { map: L.Map }).map.fire('click', { latlng: L.latLng(lat, lng) });
  }

  /** Layers drawn by renderGpx, in drawing order (each track line is followed by its click area) */
  function gpxLayers(): L.Layer[] {
    return (component as unknown as { gpxLayerGroup: L.FeatureGroup }).gpxLayerGroup.getLayers();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep the top-right corner free for the sidebar and put the map controls top-left', () => {
    const topLeft = host.querySelector('.leaflet-top.leaflet-left')!;

    expect(host.querySelector('.leaflet-top.leaflet-right')?.children).toHaveLength(0);
    expect(topLeft.querySelector('.leaflet-control-zoom')).toBeTruthy();
    expect(topLeft.querySelector('a[title="Plan a route"]')).toBeTruthy();
    expect(topLeft.querySelector('a[title="Map style"]')).toBeTruthy();
  });

    it('should restyle only the track that was customized', async () => {
    const sidebar = TestBed.inject(SidebarService);
    const trackA = { category: 'cycling' as const, segments: [{ points: [[45, 7], [45.2, 7.2]] as [number, number][] }] };
    const trackB = { category: 'hiking' as const, segments: [{ points: [[46, 8], [46.2, 8.2]] as [number, number][] }] };
    component.renderGpx({
      fileName: 'rides.gpx',
      waypoints: [],
      tracks: [trackA, trackB],
      allCoordinates: [[45, 7], [45.2, 7.2], [46, 8], [46.2, 8.2]],
    });
    // layers: lineA, clickAreaA, lineB, clickAreaB
    const [lineA, clickAreaA, lineB] = gpxLayers() as L.Polyline[];
    expect(lineA.options).toMatchObject({ color: '#2563eb' }); // keeps the cycling color

    Object.assign(trackA, { color: '#ff00ff', weight: 9 });
    sidebar.updateGpxTrack(trackA);
    await fixture.whenStable();

    expect(lineA.options).toMatchObject({ weight: 9, color: '#ff00ff' });
    expect(clickAreaA.options.weight).toBe(22); // stays easy to click
    expect(lineB.options).toMatchObject({ weight: 5, color: '#10b981' }); // other track untouched
  });

  it('should show the stats of a clicked GPX track in the sidebar', () => {
    const sidebar = TestBed.inject(SidebarService);
    const showTrackSpy = vi.spyOn(sidebar, 'showTrack').mockImplementation(() => {});
    const waypoints = [{ lat: 45.1, lon: 7.1, name: 'Fountain', isPublic: false }];
    component.renderGpx({
      fileName: 'loop.gpx',
      waypoints,
      tracks: [{ name: 'Loop', segments: [{ points: [[45, 7], [45.2, 7.2]] }] }],
      allCoordinates: [[45, 7], [45.2, 7.2]],
    });

    const trackLine = gpxLayers().find((layer): layer is L.Polyline => layer instanceof L.Polyline)!;
    trackLine.fire('click', { latlng: L.latLng(45.1, 7.1) });

    expect(showTrackSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Loop', distanceMeters: expect.any(Number) }), waypoints);
  });

  it('should toggle route planning mode with the plan button', async () => {
    const planButton = host.querySelector<HTMLAnchorElement>('a[title="Plan a route"]')!;

    planButton.click();
    await fixture.whenStable();

    expect(component.planningMode()).toBe(true);
    expect(planButton.classList).toContain('active');
    expect(host.querySelector('.route-panel')?.textContent).toContain('set the starting point');

    planButton.click();
    await fixture.whenStable();

    expect(component.planningMode()).toBe(false);
    expect(host.querySelector('.route-panel')).toBeNull();
  });

  it('should send map clicks to the route planner only in planning mode', () => {
    const selectSpy = vi.spyOn(routePlanner, 'selectPoint');

    clickMap(41.9, 12.5);
    expect(selectSpy).not.toHaveBeenCalled();

    component.togglePlanningMode();
    clickMap(41.9, 12.5);
    expect(selectSpy).toHaveBeenCalledWith({ lat: 41.9, lon: 12.5 });
  });

  it('should mark the start and destination and show the route summary', async () => {
    routePlanner.start.set({ lat: 41.89, lon: 12.49 });
    routePlanner.end.set({ lat: 41.9, lon: 12.45 });
    routePlanner.route.set({
      points: [
        { lat: 41.89, lon: 12.49 },
        { lat: 41.9, lon: 12.45 },
      ],
      distanceMeters: 4093.9,
      durationSeconds: 3276.4,
    });
    await fixture.whenStable();

    expect(host.querySelector('.route-marker-start')).toBeTruthy();
    expect(host.querySelector('.route-marker-end')).toBeTruthy();
    expect(host.querySelector('.route-panel')?.textContent).toContain('4.1 km · 55 min');
    expect(host.querySelector('.route-panel-btn.primary')?.textContent).toContain('Export GPX');
  });

  it('should draw a searched public route and smoothly zoom to it when focused from the sidebar', async () => {
    const sidebar = TestBed.inject(SidebarService);
    const map = (component as unknown as { map: L.Map }).map;
    const flyToBoundsSpy = vi.spyOn(map, 'flyToBounds').mockImplementation(() => map);

    sidebar.focusPublicRoute({
      route: {
        id: 77,
        name: 'Amalfi Coast Path',
        category: 'HIKING',
        difficulty: 'MEDIUM',
        distanceMeters: 8500,
        estimatedTimeInMinutes: 140,
        publisherUsername: 'luca',
        pictureUrl: null,
        publicRoute: true,
        reported: false,
      },
      points: [
        { latitude: 40.633, longitude: 14.602, elevation: 120, name: null },
        { latitude: 40.641, longitude: 14.581, elevation: 310, name: null },
      ],
    });
    await fixture.whenStable();

    const publicRouteLayers = (
      component as unknown as { publicRouteLayer: L.FeatureGroup }
    ).publicRouteLayer.getLayers();
    expect(publicRouteLayers.some((layer) => layer instanceof L.Polyline)).toBe(true);
    expect(flyToBoundsSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 1.0, maxZoom: 16 }),
    );
  });

  describe('public waypoints', () => {
    let http: HttpTestingController;
    const privateWp = (): GpxWaypoint => ({ lat: 46, lon: 11, desc: 'View', categories: ['peak'], photos: [], isPublic: false });

    function publicLayers(): L.Marker[] {
      return (component as unknown as { publicWaypointLayer: L.FeatureGroup }).publicWaypointLayer.getLayers() as L.Marker[];
    }

    function selectPrivateWaypoint(wp: GpxWaypoint): void {
      component.renderGpx({ fileName: 'a.gpx', waypoints: [wp], tracks: [], allCoordinates: [[46, 11]] });
      const marker = gpxLayers().find((layer): layer is L.Marker => layer instanceof L.Marker)!;
      marker.fire('click', { latlng: marker.getLatLng() });
    }

    beforeEach(() => {
      http = TestBed.inject(HttpTestingController);
    });

    it('should load the public waypoints within 200 km of the user at startup (center of Italy as fallback)', async () => {
      await fixture.whenStable();
      const req = http.expectOne((r) => r.url === WAYPOINT_ENDPOINTS.nearby);
      expect(req.request.params.get('lat')).toBe(String(ITALY_CENTER.lat));
      expect(req.request.params.get('lon')).toBe(String(ITALY_CENTER.lon));
      expect(req.request.params.get('radiusKm')).toBe('200');

      req.flush([{ id: 1, categories: ['FOUNTAIN'], description: 'Cold water', latitude: 42, longitude: 12, photos: [], publisher: 'bob' }]);

      expect(publicLayers()).toHaveLength(1);
      expect(host.querySelector('.komoot-pin.is-public')).toBeTruthy();
    });

    it('should show Make Public only for private waypoints', async () => {
      selectPrivateWaypoint(privateWp());
      await fixture.whenStable();
      expect(host.querySelector('.btn-make-public')).toBeTruthy();
      expect(host.querySelector('.btn-customize-waypoint')).toBeTruthy();

      component.openWaypointDetails({ ...privateWp(), id: 3, isPublic: true });
      await fixture.whenStable();
      expect(host.querySelector('.btn-make-public')).toBeNull();
      expect(host.querySelector('.btn-customize-waypoint')).toBeNull();
      expect(host.querySelector('.btn-report-waypoint')).toBeTruthy();
    });

    it('should ask the user to log in instead of publishing when logged out', () => {
      const auth = TestBed.inject(AuthService);
      const loginSpy = vi.spyOn(auth, 'requestLogin');
      selectPrivateWaypoint(privateWp());

      component.makeWaypointPublic();

      expect(loginSpy).toHaveBeenCalled();
      http.expectNone(WAYPOINT_ENDPOINTS.waypoints);
    });

    it('should not publish a waypoint without categories', () => {
      vi.spyOn(TestBed.inject(AuthService), 'isLoggedIn').mockReturnValue(true);
      const notify = vi.spyOn(TestBed.inject(GpxService), 'showNotification');
      selectPrivateWaypoint({ ...privateWp(), categories: [] });

      component.makeWaypointPublic();

      http.expectNone(WAYPOINT_ENDPOINTS.waypoints);
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('should save the waypoint and turn its marker orange when made public', async () => {
      vi.spyOn(TestBed.inject(AuthService), 'isLoggedIn').mockReturnValue(true);
      const wp = privateWp();
      selectPrivateWaypoint(wp);
      expect(host.querySelector('.komoot-pin.is-public')).toBeNull();

      component.makeWaypointPublic();
      http.expectOne(WAYPOINT_ENDPOINTS.waypoints).flush({
        id: 9, categories: ['PEAK'], description: 'View', latitude: 46, longitude: 11, photos: [], publisher: 'hiker',
      });
      await fixture.whenStable();

      expect(wp).toMatchObject({ id: 9, isPublic: true });
      expect(component.selectedWaypoint()).toMatchObject({ id: 9, isPublic: true });
      expect(host.querySelector('.komoot-pin.is-public')).toBeTruthy();
      expect(host.querySelector('.btn-make-public')).toBeNull();
    });

    it('should keep the waypoint private when the backend refuses it', () => {
      vi.spyOn(TestBed.inject(AuthService), 'isLoggedIn').mockReturnValue(true);
      const wp = privateWp();
      selectPrivateWaypoint(wp);

      component.makeWaypointPublic();
      http.expectOne(WAYPOINT_ENDPOINTS.waypoints).flush('bad', { status: 400, statusText: 'Bad Request' });

      expect(wp.isPublic).toBe(false);
      expect(component.isPublishing()).toBe(false);
    });
  });
});
