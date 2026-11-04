import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as L from 'leaflet';

import { ItalyMap } from './italy-map';
import { RoutePlannerService } from '../services/route-planner.service';

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

  it('should create', () => {
    expect(component).toBeTruthy();
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
