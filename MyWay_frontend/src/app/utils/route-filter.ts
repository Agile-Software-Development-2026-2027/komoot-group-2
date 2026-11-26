import* as L from 'leaflet';
import type { GpxTrack,GpxWaypoint, RouteDifficulty } from '../services/gpx.service';
import type { LatLon } from '../services/route-planner.service';
import { computeElevationStats } from './route-stats';
import type { RoutePoint, PublishedRoute} from '../services/route-publishing.service';


export const MAX_ALTITUDE_METERS=8000;
//routes ending up to this distance beyond the radius are shown as "near"
export const RADIUS_TOLERANCE_METERS= 2000;
export const MIN_RADIUS_KM =1;
export const DEFAULT_RADIUS_KM=5;
export const INITIAL_RADIUS_SLIDE_MAX_KM =50;
export const DEFAULT_TIME_HOUR= 0.5;
export const INITIAL_TIME_SLIDE_MAX_HOUR= 24;
export const MIN_ROUTE_KM= 1;
export const WALKING_SPEED_KMH= 4;
export const ALL_DIFFICULTIES: RouteDifficulty[]= ['easy','intermediate','hard'];
export const MIN_FAILED_FOR_NEAR=1;
export const MAX_FAILED_FOR_NEAR=2;

export interface RouteFilters {
    center: LatLon | null;
    radiusKm: number;
    difficulties: RouteDifficulty[] ;
    maxAltitude: number;
    totKm: number | null;
    time : number|null; 
}
export const DEFAULT_ROUTE_FILTERS: RouteFilters ={
center: null,
radiusKm: DEFAULT_RADIUS_KM,
difficulties: [...ALL_DIFFICULTIES],
maxAltitude: MAX_ALTITUDE_METERS,
totKm: null,
time : null,
};

export interface FilterResult {
    visibility: Visibility;
    failed: string[];
}

export type Visibility = 'visible' | 'near' | 'hidden';

function distanceMeters(a: LatLon, b: LatLon): number {
    return L.latLng(a.lat, a.lon).distanceTo(L.latLng(b.lat, b.lon));
}
// we obtain the first point of a track on the map
function startPointTrackRoute(track: GpxTrack): LatLon | null{
    const first= track.segments.at(0)?.points.at(0);
    return first ? {lat: first[0], lon: first[1]}: null ;
}
// we obtain first point of a public route
function startPointPublicRoute (points: RoutePoint[]) : LatLon| null {
    const first= points.at(0);
    if (!first) return null;
    return {lat: first.latitude, lon: first.longitude};
}

//depending on the distance between first point of route and center of radius return 'visible', 'near', 'hidden'
function radiusMatch (startPoint: LatLon |null , filters: RouteFilters): Visibility {
    const center =filters.center;
    if(!center) return 'visible';
    if(!startPoint) return 'visible';
    const distance = distanceMeters(center, startPoint); 
    const radiusMeters = filters.radiusKm * 1000;
    if( distance <= radiusMeters) return 'visible';
    if(distance <= radiusMeters + RADIUS_TOLERANCE_METERS ) return 'near';
    return 'hidden';
}
// we apply radiusMatch to GpxTrack
function trackRadiusMatch (track: GpxTrack, filters: RouteFilters): Visibility{
    return radiusMatch(startPointTrackRoute(track),filters);
}
//we apply radiusMatch to PublicRoute
export function pubRouteRadiusMatch(points:RoutePoint[], filters: RouteFilters): Visibility{
     return radiusMatch(startPointPublicRoute(points), filters);
}

// The slider of radius has no limit because when it reaches the end it doubles each time
export function radiusSliderMax (radiusKm: number): number {
    let max = INITIAL_RADIUS_SLIDE_MAX_KM;
    while (radiusKm > max) {
        max*=2;
    }
    return max; 
}
// hours needed to be compared with the maximum time chosen by the user
export function timeMatch( hours:number |null , filters: RouteFilters): Visibility {
      const maxHours= filters.time;
      if (maxHours === null || hours === null) return 'visible';
      return hours <= maxHours ? 'visible' : 'hidden';
}
// time to cover the whole Track and compare with filter
function trackTimeMatch (track:GpxTrack, filters: RouteFilters): Visibility {
    const seconds = track.estimatedDurationSeconds; 
    if (seconds == null){
        return timeMatch( null, filters);
    }
    const hours= seconds/3600;
    return timeMatch(hours, filters);
}
// time to cover the whole public route and compare with filter
export function pubRouteTimeMatch (route: PublishedRoute, filters: RouteFilters): Visibility {
    const minutes= route.estimatedTimeInMinutes;
    if (minutes == null) {
        return timeMatch(null,filters);
    }
    const hours = minutes/60;
    return timeMatch(hours,filters);
}
// The slider of time has non limit because when it reaches the end it doubles each time
export function timeSliderMax (timeHour: number): number {
    let max= INITIAL_TIME_SLIDE_MAX_HOUR;
    while (timeHour> max) {
        max*=2;
    }
    return max;
}
// filter of time for waypoints
function waypointTime (waypoint: GpxWaypoint, filters: RouteFilters ): Visibility {
    const center = filters.center;
    if (filters.time === null || !center) return 'visible';
    const km = distanceMeters(center, {lat: waypoint.lat, lon: waypoint.lon})/1000;
     return timeMatch( km / WALKING_SPEED_KMH, filters);
}
// true if the route is not longer than tha maximum chosen by the user
export function lengthMatches (km: number | null , filters: RouteFilters): boolean {
    const maxKm = filters.totKm;
    if (maxKm === null || km == null) return true;
    return km <= maxKm;
}
//it takes meters of route by GpxTrack, convert in km and ask to lengthMatches if is visible(true) or not
function trackLengthMatches (track: GpxTrack, filters: RouteFilters) : boolean {
 const meters = track.distanceMeters;
 if( meters == null) {
    return true;
 }
 const km= meters/1000;
 return  lengthMatches(km, filters);
}
export function pbRouteLengthMatches(route: PublishedRoute, filters: RouteFilters): boolean{
    const meters= route.distanceMeters;
    if (meters == null) {
        return true;
    }
    const km= meters/1000;
    return lengthMatches(km, filters);
}

// max altitude of route
function maxElevationTrack (track: GpxTrack): number |null{
 const elevations= track.segments.flatMap((segment) => segment.elevations ?? []);
 const values= elevations.filter((el): el is number => el !== null);
 return values.length>0 ? Math.max(...values) : null;
}
//max altitude of public route
function maxElevationPubRoute (points: RoutePoint[]): number | null {
   const elevations = points.map((p) => p.elevation);
  const values= elevations.filter ((el): el is number => el !== null);
   return values.length>0 ? Math.max(...values) : null; 
}
 function ascentFromElevations (elevations: (number | null)[]): number|null{
    const stats= computeElevationStats(elevations);
    if(!stats) return null;
    return stats.ascentMeters;
 }
 //ascent meters of a track
 export function trackAscentMeters (track: GpxTrack): number|null{
    const elevations= track.segments.flatMap((seg)=> seg.elevations ?? []);
    return ascentFromElevations(elevations);
 }
 //ascent meters of a public route
 export function pubRouteAscentMeters (points: RoutePoint[]): number|null{
    const elevations= points.map((p)=> p.elevation);
    return ascentFromElevations(elevations);
 }

 function isAbove(value:number|null, limit: number): boolean {
    return value!== null && value > limit;
 }
 
  export function computeDifficulty (km: number|null, ascentMt: number|null, hours:number|null ): RouteDifficulty{
   if(isAbove (km,15)|| isAbove(ascentMt,700)||isAbove(hours,4)){
    return 'hard';
   }
   if(isAbove (km,8)|| isAbove(ascentMt,300)||isAbove(hours,2)){
    return 'intermediate';
   }
   return 'easy';
  }
  export function trackDifficulty(track:GpxTrack): RouteDifficulty {
    const km= track.distanceMeters == null ? null: track.distanceMeters/1000;
    const hours= track.estimatedDurationSeconds == null ? null: track.estimatedDurationSeconds/3600;
    return computeDifficulty(km,trackAscentMeters(track),hours);
  }
export function pubRouteDifficulty(route: PublishedRoute, points: RoutePoint[]): RouteDifficulty{
    const km= route.distanceMeters == null ? null: route.distanceMeters/1000;
    const hours= route.estimatedTimeInMinutes== null? null: route.estimatedTimeInMinutes/60;
    return computeDifficulty(km,pubRouteAscentMeters(points),hours);
}
// true if difficulty of the route is one of the buttons that are on
function difficultyMatches(difficulty: RouteDifficulty |undefined, filters: RouteFilters): boolean {
    if(difficulty==undefined) return true;
    return filters.difficulties.includes(difficulty);
}
//returns true if the filter is active
export function isAltitudeFilterActive (filters: RouteFilters): boolean {
return filters.maxAltitude < MAX_ALTITUDE_METERS;
}
//if the filter is active return true when the altitude of route is lesser than filter
function altitudeMatches (maxElevation: number|null, filters: RouteFilters): boolean {
    if (!isAltitudeFilterActive(filters)) return true;
    if(maxElevation === null ) return true;
    return maxElevation <= filters.maxAltitude;
}

function trackAltitudeMatches(track:GpxTrack,filters:RouteFilters): boolean{
    return altitudeMatches(maxElevationTrack(track),filters);
}
function pubRouteAltitudeMatches(points: RoutePoint[], filters: RouteFilters): boolean{
    return altitudeMatches(maxElevationPubRoute(points),filters);
}
//if 0 filters failed: visible, if 2 limits failed: near (dashed), otherwise hidden
function summarize(failed:string[]): FilterResult{
    if (failed.length===0) return {visibility: 'visible', failed};
    if (failed.length>= MIN_FAILED_FOR_NEAR && failed.length<= MAX_FAILED_FOR_NEAR){
        return {visibility: 'near', failed};
    }
    return {visibility:'hidden', failed};
}
 export function evaluateTrack (track: GpxTrack, filters: RouteFilters): FilterResult{
    const failed : string[]=[];
    if (trackRadiusMatch(track,filters) !== 'visible') failed.push('Outside the selected radius');
    if (trackTimeMatch(track,filters) !== 'visible') failed.push('Outside the selected time');
    if (!difficultyMatches(trackDifficulty(track),filters)) failed.push('Difficulty not in the selection');
    if (!trackLengthMatches(track,filters)) failed.push('Over the selected length');
    if (!trackAltitudeMatches(track,filters)) failed.push('Over the selected elevation');
    return summarize(failed);
 }
export function evaluatePublicRoute(route: PublishedRoute, points: RoutePoint[], filters: RouteFilters): FilterResult{
    const failed: string[]= [];
    if(pubRouteRadiusMatch(points,filters) !== 'visible') failed.push('Outside the selected radius');
    if(pubRouteTimeMatch(route,filters) !== 'visible') failed.push('Over the selected time');
    if(!difficultyMatches(pubRouteDifficulty(route,points),filters)) failed.push('Difficulty not in the selection');
    if(!pbRouteLengthMatches(route,filters)) failed.push('Over the selected length');
    if(!pubRouteAltitudeMatches(points,filters)) failed.push('Over the selected elevation');
    return summarize(failed);
}

export function matchWaypoint (waypoint: GpxWaypoint,filters: RouteFilters): FilterResult {
    const failed: string[]=[];
    const radius = radiusMatch({ lat: waypoint.lat, lon: waypoint.lon }, filters);
    if (radius !== 'visible') failed.push('Outside the selected radius');
    if (isAltitudeFilterActive(filters) && waypoint.ele !== undefined && waypoint.ele > filters.maxAltitude) {
        failed.push('Over the selected elevation');
    }
    const time= waypointTime(waypoint,filters);
    if (time === 'hidden') failed.push('Over the selected time');
    return summarize(failed);
}
