import { TestBed } from '@angular/core/testing';
import { ALL_DIFFICULTIES, DEFAULT_ROUTE_FILTERS, MAX_ALTITUDE_METERS } from '../utils/route-filter';
import { RouteFilterService } from './route-filter.service';

describe('RouteFilterService', () => {
  let service: RouteFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouteFilterService);
  });

  it('should start with the default filters: no limit and every difficulty on', () => {
    expect(service.filters()).toEqual(DEFAULT_ROUTE_FILTERS);
    expect(service.difficulties()).toEqual(ALL_DIFFICULTIES);
  });

  it('should set the radius center and distance', () => {
    service.setCenter({ lat: 41.9, lon: 12.5 });
    service.setRadius(20);
    expect(service.filters().center).toEqual({ lat: 41.9, lon: 12.5 });
    expect(service.filters().radiusKm).toBe(20);
  });

  it('should pick the center and turn the radius off', () => {
    service.startPickingCenter();
    expect(service.pickingCenter()).toBe(true);
    service.setCenter({ lat: 41.9, lon: 12.5 });
    service.clearCenter();
    expect(service.center()).toBeNull();
    expect(service.pickingCenter()).toBe(false);
  });

  it('should turn a difficulty off when clicked and on when clicked again', () => {
    service.toggleDifficulty('easy');
    expect(service.difficulties()).not.toContain('easy');
    expect(service.difficulties()).toContain('hard');
    service.toggleDifficulty('easy');
    expect(service.difficulties()).toContain('easy');
  });

  it('should keep the maximum altitude inside its limits', () => {
    service.setMaxAltitude(-100);
    expect(service.maxAltitude()).toBe(0);
    service.setMaxAltitude(MAX_ALTITUDE_METERS + 1000);
    expect(service.maxAltitude()).toBe(MAX_ALTITUDE_METERS);
  });

  it('should set the maximum length and time, and turn them off with null', () => {
    service.setTotKm(10);
    service.setTime(2);
    expect(service.filters().totKm).toBe(10);
    expect(service.filters().time).toBe(2);
    service.setTotKm(null);
    service.setTime(null);
    expect(service.filters().totKm).toBeNull();
    expect(service.filters().time).toBeNull();
  });

  it('should reset every filter', () => {
    service.setCenter({ lat: 41.9, lon: 12.5 });
    service.toggleDifficulty('easy');
    service.setMaxAltitude(300);
    service.setTotKm(10);
    service.setTime(2);
    service.reset();
    expect(service.filters()).toEqual(DEFAULT_ROUTE_FILTERS);
  });
});