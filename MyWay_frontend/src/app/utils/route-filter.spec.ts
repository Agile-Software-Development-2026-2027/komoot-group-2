import { describe, expect, it } from 'vitest';
import type { GpxTrack, GpxWaypoint } from '../services/gpx.service';
import type { PublishedRoute, RoutePoint } from '../services/route-publishing.service';
import {
  ALL_DIFFICULTIES,
  DEFAULT_ROUTE_FILTERS,
  evaluatePublicRoute,
  evaluateTrack,
  matchWaypoint,
  radiusSliderMax,
  timeSliderMax,
  type RouteFilters,
} from './route-filter';

// ---------- helpers ----------

const CENTER = { lat: 41.9, lon: 12.5 };
const NEAR_LAT = CENTER.lat + 0.02; // about 2 km from the center
const FAR_LAT = CENTER.lat + 0.1; // about 11 km from the center

// default filters (nothing limited) with the changes of the single test
function filters(overrides: Partial<RouteFilters> = {}): RouteFilters {
  return { ...DEFAULT_ROUTE_FILTERS, difficulties: [...ALL_DIFFICULTIES], ...overrides };
}

// default track: starts near the center, 5 km, 1 hour -> easy
function makeTrack(startLat = NEAR_LAT, overrides: Partial<GpxTrack> = {}): GpxTrack {
  return {
    segments: [{ points: [[startLat, CENTER.lon], [startLat + 0.01, CENTER.lon]] }],
    distanceMeters: 5000,
    estimatedDurationSeconds: 3600,
    ...overrides,
  };
}

// default public route: 5 km, 60 minutes -> easy
function makePublicRoute(overrides: Partial<PublishedRoute> = {}): PublishedRoute {
  return {
    id: 1,
    name: 'Public route',
    category: 'HIKING',
    difficulty: 'EASY',
    distanceMeters: 5000,
    estimatedTimeInMinutes: 60,
    publisherUsername: 'someone',
    pictureUrl: null,
    publicRoute: true,
    reported: false,
    ...overrides,
  };
}

function makePoints(startLat: number): RoutePoint[] {
  return [
    { latitude: startLat, longitude: CENTER.lon, elevation: null, name: null },
    { latitude: startLat + 0.01, longitude: CENTER.lon, elevation: null, name: null },
  ];
}

function makeWaypoint(lat: number, overrides: Partial<GpxWaypoint> = {}): GpxWaypoint {
  return { lat, lon: CENTER.lon, isPublic: false, ...overrides } as GpxWaypoint;
}

// ---------- tracks ----------

describe('evaluateTrack', () => {
  it('shows a track when no filter is set', () => {
    expect(evaluateTrack(makeTrack(FAR_LAT), filters())).toEqual({ visibility: 'visible', failed: [] });
  });

  it('reports a track that starts outside the radius', () => {
    const inside = evaluateTrack(makeTrack(NEAR_LAT), filters({ center: CENTER, radiusKm: 5 }));
    const outside = evaluateTrack(makeTrack(FAR_LAT), filters({ center: CENTER, radiusKm: 5 }));
    expect(inside.failed).toEqual([]);
    expect(outside.failed).toEqual(['Outside the selected radius']);
  });

  it('reports a track that takes more than the chosen time', () => {
    expect(evaluateTrack(makeTrack(), filters({ time: 0.5 })).failed).toEqual(['Outside the selected time']);
    expect(evaluateTrack(makeTrack(), filters({ time: 1 })).failed).toEqual([]);
  });

  it('reports a track longer than the chosen length', () => {
    const track = makeTrack(NEAR_LAT, { distanceMeters: 10000 });
    expect(evaluateTrack(track, filters({ totKm: 5 })).failed).toEqual(['Outside the selected length']);
    expect(evaluateTrack(track, filters({ totKm: 10 })).failed).toEqual([]);
  });

  it('reports a track whose highest point is over the chosen altitude', () => {
    const track = makeTrack(NEAR_LAT, {
      segments: [{ points: [[NEAR_LAT, CENTER.lon], [NEAR_LAT + 0.01, CENTER.lon]], elevations: [100, 2500] }],
    });
    expect(evaluateTrack(track, filters({ maxAltitude: 2000 })).failed).toEqual(['Outside the selected elevation']);
    expect(evaluateTrack(makeTrack(), filters({ maxAltitude: 2000 })).failed).toEqual([]); // no altitude data
  });

  it('reports a track whose difficulty button is off', () => {
    // 5 km and 1 hour is easy, 20 km is hard
    const easyOff = filters({ difficulties: ['intermediate', 'hard'] });
    expect(evaluateTrack(makeTrack(), easyOff).failed).toEqual(['Difficulty not in the selection']);
    const hardTrack = makeTrack(NEAR_LAT, { distanceMeters: 20000 });
    expect(evaluateTrack(hardTrack, filters({ difficulties: ['easy', 'intermediate'] })).failed).toEqual([
      'Difficulty not in the selection',
    ]);
  });

  it('is near with 1 or 2 filters not respected and hidden with 3', () => {
    const far = makeTrack(FAR_LAT);
    const one = evaluateTrack(far, filters({ center: CENTER, radiusKm: 5 }));
    const two = evaluateTrack(far, filters({ center: CENTER, radiusKm: 5, time: 0.5 }));
    const three = evaluateTrack(far, filters({ center: CENTER, radiusKm: 5, time: 0.5, totKm: 2 }));
    expect(one.visibility).toBe('near');
    expect(two.visibility).toBe('near');
    expect(two.failed).toEqual(['Outside the selected radius', 'Outside the selected time']);
    expect(three.visibility).toBe('hidden');
  });
});

// ---------- public routes ----------

describe('evaluatePublicRoute', () => {
  it('shows a public route when no filter is set', () => {
    const result = evaluatePublicRoute(makePublicRoute(), makePoints(NEAR_LAT), filters());
    expect(result).toEqual({ visibility: 'visible', failed: [] });
  });

  it('reports a route that starts outside the radius', () => {
    const result = evaluatePublicRoute(makePublicRoute(), makePoints(FAR_LAT), filters({ center: CENTER, radiusKm: 5 }));
    expect(result.failed).toEqual(['Outside the selected radius']);
  });

  it('converts minutes to hours and meters to km', () => {
    const route = makePublicRoute({ estimatedTimeInMinutes: 120, distanceMeters: 12000 });
    const result = evaluatePublicRoute(route, makePoints(NEAR_LAT), filters({ time: 1, totKm: 10 }));
    expect(result.failed).toEqual(['Outside the selected time', 'Outside the selected length']);
  });

  it('keeps a route when the points are not loaded yet', () => {
    const result = evaluatePublicRoute(makePublicRoute(), [], filters({ center: CENTER, maxAltitude: 2000 }));
    expect(result.visibility).toBe('visible');
  });
});

// ---------- waypoints ----------

describe('matchWaypoint', () => {
  it('shows a waypoint when no filter is set', () => {
    expect(matchWaypoint(makeWaypoint(FAR_LAT), filters())).toEqual({ visibility: 'visible', failed: [] });
  });

  it('reports a waypoint outside the radius, also when it is public', () => {
    const waypoint = makeWaypoint(FAR_LAT, { isPublic: true });
    expect(matchWaypoint(waypoint, filters({ center: CENTER, radiusKm: 5 })).failed).toEqual([
      'Outside the selected radius',
    ]);
  });

  it('reports a waypoint that takes more than the chosen time to reach', () => {
    // about 10 km from the center: at 4 km/h it takes 2.5 hours
    const waypoint = makeWaypoint(CENTER.lat + 0.09);
    expect(matchWaypoint(waypoint, filters({ center: CENTER, radiusKm: 50, time: 1 })).failed).toEqual([
      'Outside the selected time',
    ]);
    expect(matchWaypoint(waypoint, filters({ center: CENTER, radiusKm: 50, time: 3 })).failed).toEqual([]);
  });

  it('reports a waypoint over the chosen altitude, and keeps one without altitude', () => {
    expect(matchWaypoint(makeWaypoint(NEAR_LAT, { ele: 3000 }), filters({ maxAltitude: 2000 })).failed).toEqual([
      'Outside the selected elevation',
    ]);
    expect(matchWaypoint(makeWaypoint(NEAR_LAT), filters({ maxAltitude: 2000 })).failed).toEqual([]);
  });
});

// ---------- sliders ----------

describe('slider max', () => {
  it('doubles the radius slider each time the value reaches the end', () => {
    expect(radiusSliderMax(5)).toBe(50);
    expect(radiusSliderMax(50)).toBe(100);
    expect(radiusSliderMax(150)).toBe(200);
  });

  it('doubles the time slider each time the value reaches the end', () => {
    expect(timeSliderMax(0.5)).toBe(24);
    expect(timeSliderMax(24)).toBe(48);
  });
});
