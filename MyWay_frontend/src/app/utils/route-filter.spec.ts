import type { GpxTrack, GpxWaypoint, RouteDifficulty } from '../services/gpx.service';
import { DEFAULT_ROUTE_FILTERS, RouteFilters, matchTrack, matchWaypoint } from './route-filter';

const CENTER = { lat: 41.9, lon: 12.5 };
const WITH_RADIUS: RouteFilters = { ...DEFAULT_ROUTE_FILTERS, center: CENTER, radiusKm: 10 };

function makeTrack(endLat: number, difficulty?: RouteDifficulty, elevations?: number[]): GpxTrack {
  return {
    segments: [{ points: [[41.9, 12.5], [endLat, 12.5]], elevations }],
    difficulty,
  };
}
describe('matchTrack', () => {
  it('shows every route when no filter is set', () => {
    expect(matchTrack(makeTrack(45), DEFAULT_ROUTE_FILTERS)).toBe('visible');
  });

  it('shows a route whose start and end are inside the radius', () => {
    expect(matchTrack(makeTrack(41.95), WITH_RADIUS)).toBe('visible');
  });

  it('marks as near a route ending just outside the radius', () => {
    expect(matchTrack(makeTrack(42.0), WITH_RADIUS)).toBe('near');
  });

  it('hides a route ending far from the radius', () => {
    expect(matchTrack(makeTrack(42.1), WITH_RADIUS)).toBe('hidden');
  });
    it('keeps only the routes with the selected difficulty', () => {
    const filters: RouteFilters = { ...DEFAULT_ROUTE_FILTERS, difficulty: 'easy' };
    expect(matchTrack(makeTrack(41.95, 'easy'), filters)).toBe('visible');
    expect(matchTrack(makeTrack(41.95, 'hard'), filters)).toBe('hidden');
  });

  it('keeps only the routes inside the altitude range', () => {
    const track = makeTrack(41.95, 'easy', [100, 300]);
    expect(matchTrack(track, { ...DEFAULT_ROUTE_FILTERS, minAltitude: 50, maxAltitude: 400 })).toBe('visible');
    expect(matchTrack(track, { ...DEFAULT_ROUTE_FILTERS, minAltitude: 0, maxAltitude: 200 })).toBe('hidden');
  });

  it('does not filter the routes without altitude data', () => {
    expect(matchTrack(makeTrack(41.95), { ...DEFAULT_ROUTE_FILTERS, minAltitude: 1000 })).toBe('visible');
  });
    it('combines the active filters', () => {
    const filters: RouteFilters = { ...WITH_RADIUS, difficulty: 'easy' };
    expect(matchTrack(makeTrack(41.95, 'easy'), filters)).toBe('visible');
    expect(matchTrack(makeTrack(41.95, 'hard'), filters)).toBe('hidden');
    expect(matchTrack(makeTrack(42.1, 'easy'), filters)).toBe('hidden');
  });
});
describe('matchWaypoint', () => {
  const waypoint: GpxWaypoint = { lat: 41.95, lon: 12.5, ele: 200, isPublic: false };

  it('shows every waypoint when no filter is set', () => {
    expect(matchWaypoint(waypoint, undefined, DEFAULT_ROUTE_FILTERS)).toBe(true);
  });

  it('keeps only the waypoints inside the radius', () => {
    expect(matchWaypoint(waypoint, undefined, WITH_RADIUS)).toBe(true);
    expect(matchWaypoint({ ...waypoint, lat: 42.1 }, undefined, WITH_RADIUS)).toBe(false);
  });

  it('uses the difficulty of its route', () => {
    const filters: RouteFilters = { ...DEFAULT_ROUTE_FILTERS, difficulty: 'hard' };
    expect(matchWaypoint(waypoint, 'hard', filters)).toBe(true);
    expect(matchWaypoint(waypoint, 'easy', filters)).toBe(false);
  });

  it('keeps only the waypoints inside the altitude range', () => {
    const filters: RouteFilters = { ...DEFAULT_ROUTE_FILTERS, minAltitude: 300 };
    expect(matchWaypoint(waypoint, undefined, filters)).toBe(false);
    expect(matchWaypoint({ ...waypoint, ele: undefined }, undefined, filters)).toBe(true);
  });
});