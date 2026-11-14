import { TestBed } from '@angular/core/testing';
import { DEFAULT_ROUTE_FILTERS } from '../utils/route-filter';
import { RouteFilterService } from './route-filter.service';

describe('RouteFilterService', () => {
  let service: RouteFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouteFilterService);
  });
    it('should start with every filter off', () => {
    expect(service.filters()).toEqual(DEFAULT_ROUTE_FILTERS);
  });

  it('should set the radius center and distance', () => {
    service.setCenter({ lat: 41.9, lon: 12.5 });
    service.setRadius(20);
    expect(service.filters().center).toEqual({ lat: 41.9, lon: 12.5 });
    expect(service.filters().radiusKm).toBe(20);
  });
    it('should select one difficulty at a time and turn it off when clicked again', () => {
    service.toggleDifficulty('easy');
    expect(service.difficulty()).toBe('easy');
    service.toggleDifficulty('hard');
    expect(service.difficulty()).toBe('hard');
    service.toggleDifficulty('hard');
    expect(service.difficulty()).toBeNull();
  });
    it('should keep the altitude inside its limits', () => {
    service.setMinAltitude(-100);
    expect(service.minAltitude()).toBe(0);
    service.setMaxAltitude(9000);
    expect(service.maxAltitude()).toBe(5000);
  });

  it('should not let the minimum altitude go above the maximum', () => {
    service.setMaxAltitude(1000);
    service.setMinAltitude(2000);
    expect(service.minAltitude()).toBe(1000);
    service.setMinAltitude(500);
    service.setMaxAltitude(200);
    expect(service.maxAltitude()).toBe(500);
  });
    it('should reset every filter', () => {
    service.setCenter({ lat: 41.9, lon: 12.5 });
    service.toggleDifficulty('easy');
    service.setMinAltitude(300);
    service.reset();
    expect(service.filters()).toEqual(DEFAULT_ROUTE_FILTERS);
  });
});