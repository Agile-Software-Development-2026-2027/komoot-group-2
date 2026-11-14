import* as L from 'leaflet';
import type { GpxTrack,GpxWaypoint,RouteDifficulty } from '../services/gpx.service';
import type { LatLon } from '../services/route-planner.service';
import { computeElevationStats } from './route-stats';
import { DeferBlockFixture } from '@angular/core/testing';
 
export const MIN_ALTITUDE_METERS= 0;
export const MAX_ALTITUDE_METERS=5000;
//reoutes ending up to this distance beyond the radius are shown as "near"
export const RADIUS_TOLERANCE_METERS= 2000;

export interface RouteFilters {
    center: LatLon | null;
    radiusKm: number;
    difficulty: RouteDifficulty | null;
    minAltitude: number;
    maxAltitude: number;
}
export const DEFAULT_ROUTE_FILTERS: RouteFilters ={
center: null,
radiusKm: 10,
difficulty: null,
minAltitude: MIN_ALTITUDE_METERS,
maxAltitude: MAX_ALTITUDE_METERS,
};

export type TrackMatch= 'visible' | 'near' | 'hidden';

export function isAltitudeFilterActive (filters: RouteFilters): boolean {
return filters.minAltitude > MIN_ALTITUDE_METERS || filters.maxAltitude < MAX_ALTITUDE_METERS;
}

function distanceMeters(a: LatLon, b: LatLon): number {
    return L.latLng(a.lat, a.lon).distanceTo(L.latLng(b.lat, b.lon));
}
function trackEnds(track: GpxTrack): LatLon[]{
    const first= track.segments.at(0)?.points.at(0);
    const last= track.segments.at(-1)?.points.at(-1);
    if(!first || !last) return [];
    return [
        {lat: first[0], lon: first[1]},
        {lat: last[0], lon: last[1]},
    ];
}
function radiusMatch (track: GpxTrack, filters: RouteFilters): TrackMatch {
const center =filters.center;
if(!center) return 'visible';

const ends= trackEnds(track);
if(ends.length ===0) return 'hidden';

const farthest = Math.max(...ends.map((point) => distanceMeters(center, point) ));
const radiusMeters = filters.radiusKm * 1000;
if( farthest<= radiusMeters) return 'visible';
if(farthest <= radiusMeters + RADIUS_TOLERANCE_METERS ) return 'near';
return 'hidden';
}

function difficultyMatches(difficulty: RouteDifficulty |undefined, filters: RouteFilters): boolean {
return filters.difficulty === null || difficulty === filters.difficulty;
}
function altitudeMatches (track: GpxTrack, filters: RouteFilters): boolean {
    if (!isAltitudeFilterActive(filters)) return true;
    const stats= computeElevationStats(track.segments.flatMap((seg) => seg.elevations ??[]));
    if (!stats) return true;
    return stats.minMeters >= filters.minAltitude && stats.maxMeters <= filters.maxAltitude;
}

export function matchTrack (track: GpxTrack, filters: RouteFilters): TrackMatch{
    if (!difficultyMatches(track.difficulty, filters) || !altitudeMatches(track, filters)) {
        return 'hidden';
    }
    return radiusMatch( track,filters);
}
export function matchWaypoint(
    waypoint : GpxWaypoint,
    routeDifficulty: RouteDifficulty | undefined,
    filters: RouteFilters,
): boolean {
    if(!difficultyMatches(routeDifficulty,filters)) return false;
    const center= filters.center;
    if(center && distanceMeters(center, {lat: waypoint.lat, lon: waypoint.lon})> filters.radiusKm * 1000){
        return false;
    }
    if (isAltitudeFilterActive(filters) && waypoint.ele !== undefined){
        return waypoint.ele >= filters.minAltitude && waypoint.ele <= filters.maxAltitude;
    }
    return true;
}