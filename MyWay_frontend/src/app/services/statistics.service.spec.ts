import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { STATISTICS_ENDPOINT } from '../config/api.config';
import { StatisticsService, computeStatistics } from './statistics.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StatisticsService);
    http = TestBed.inject(HttpTestingController);
  });

  it('should start with empty statistics', () => {
    expect(service.statistics().tripCount).toBe(0);
  });

  it('should load statistics from the backend and map the enum names', () => {
    service.load();
    http.expectOne(STATISTICS_ENDPOINT).flush({
      tripCount: 2,
      totalDurationSeconds: 3600,
      totalDistanceMeters: 5000,
      totalElevationGainMeters: 250,
      routeTypes: { HIKING: 1, CYCLING: 1 },
      difficulties: { EASY: 1, MEDIUM: 1 },
      waypointCategories: { PANORAMIC_VIEW: 2 },
    });

    const s = service.statistics();
    expect(s.tripCount).toBe(2);
    expect(s.routeTypes).toEqual({ hiking: 1, cycling: 1 });
    expect(s.difficulties).toEqual({ easy: 1, intermediate: 1 });
    expect(s.waypointCategories).toEqual({ 'panoramic view': 2 });
    expect(service.loading()).toBe(false);
    expect(service.error()).toBe(false);
  });

  it('should reset the statistics and flag the error when the request fails', () => {
    service.load();
    http.expectOne(STATISTICS_ENDPOINT).flush('x', { status: 500, statusText: 'Server Error' });

    expect(service.statistics().tripCount).toBe(0);
    expect(service.error()).toBe(true);
  });
});

describe('computeStatistics', () => {
  it('should aggregate totals and counts', () => {
    const s = computeStatistics([
      { category: 'hiking', difficulty: 'easy', durationSeconds: 60, distanceMeters: 100, elevationGainMeters: 10, waypointCategories: ['peak'] },
      { category: 'hiking', difficulty: 'hard', durationSeconds: 40, distanceMeters: 50, elevationGainMeters: 5, waypointCategories: ['peak', 'shelter'] },
    ]);
    expect(s.tripCount).toBe(2);
    expect(s.totalDurationSeconds).toBe(100);
    expect(s.totalDistanceMeters).toBe(150);
    expect(s.routeTypes).toEqual({ hiking: 2 });
    expect(s.waypointCategories).toEqual({ peak: 2, shelter: 1 });
  });
});
