import { describe, expect, it } from 'vitest';
import { computeElevationStats, formatDistance, formatDuration, sampleEvenly } from './route-stats';

describe('route-stats', () => {
  describe('computeElevationStats', () => {
    it('should compute max, min, ascent and descent of a profile', () => {
      expect(computeElevationStats([100, 150, 120, 200, 180])).toEqual({
        maxMeters: 200,
        minMeters: 100,
        ascentMeters: 130, // +50 +80
        descentMeters: 50, // -30 -20
      });
    });

    it('should ignore missing values', () => {
      expect(computeElevationStats([null, 100, undefined, 110, NaN])).toEqual({
        maxMeters: 110,
        minMeters: 100,
        ascentMeters: 10,
        descentMeters: 0,
      });
    });

    it('should not count small jitter as climbing but keep slow steady climbs', () => {
      const jitter = [100, 101, 100, 102, 100, 101, 100];
      expect(computeElevationStats(jitter)?.ascentMeters).toBe(0);

      const steadyClimb = Array.from({ length: 21 }, (_, i) => 100 + i); // +1 m per point
      expect(computeElevationStats(steadyClimb)?.ascentMeters).toBe(18); // last 2 m are below the threshold
    });

    it('should return null when no elevation is available', () => {
      expect(computeElevationStats([])).toBeNull();
      expect(computeElevationStats([null, null])).toBeNull();
    });
  });

  describe('sampleEvenly', () => {
    it('should return all items when there are not more than the maximum', () => {
      expect(sampleEvenly([1, 2, 3], 5)).toEqual([1, 2, 3]);
    });

    it('should keep the first and the last item and spread the others', () => {
      const items = Array.from({ length: 11 }, (_, i) => i);
      expect(sampleEvenly(items, 3)).toEqual([0, 5, 10]);
      expect(sampleEvenly(items, 6)).toEqual([0, 2, 4, 6, 8, 10]);
    });
  });

  it('should format distances and durations', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(4093.9)).toBe('4.1 km');
    expect(formatDuration(3276.4)).toBe('55 min');
    expect(formatDuration(5400)).toBe('1 h 30 min');
  });
});
