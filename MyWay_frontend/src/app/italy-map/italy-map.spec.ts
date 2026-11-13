import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as L from 'leaflet';

import { ItalyMap } from './italy-map';
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

  it('should keep the top-left corner free for the sidebar and put the map controls bottom-right', () => {
    const bottomRight = host.querySelector('.leaflet-bottom.leaflet-right')!;

    expect(host.querySelector('.leaflet-top.leaflet-left')?.children).toHaveLength(0);
    expect(bottomRight.querySelector('.leaflet-control-zoom')).toBeTruthy();
    expect(bottomRight.querySelector('a[title="Plan a route"]')).toBeTruthy();
    expect(bottomRight.querySelector('a[title="Map style"]')).toBeTruthy();
  });

  it('should restyle only the visible track lines, and only with what changed', () => {
    const trackStyle = TestBed.inject(TrackStyleHandler);
    const track = { category: 'cycling' as const, segments: [{ points: [[45, 7], [45.2, 7.2]] as [number, number][] }] };
    component.renderGpx({ fileName: 'ride.gpx', waypoints: [], tracks: [track], allCoordinates: [[45, 7], [45.2, 7.2]] });
    const [line, clickArea] = gpxLayers() as L.Polyline[];

    trackStyle.setWeight(9);
    expect(line.options).toMatchObject({ weight: 9, color: '#2563eb' }); // keeps the cycling color
    expect(clickArea.options.weight).toBe(22); // stays easy to click

    trackStyle.setColor('#ff00ff');
    expect(line.options).toMatchObject({ weight: 9, color: '#ff00ff' });
    expect(track).toMatchObject({ color: '#ff00ff' });
  });

  it('should show the stats of a clicked GPX track in the sidebar', () => {
    const sidebar = TestBed.inject(SidebarService);
    const showTrackSpy = vi.spyOn(sidebar, 'showTrack').mockImplementation(() => {});
    const waypoints = [{ lat: 45.1, lon: 7.1, name: 'Fountain' }];
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
});
