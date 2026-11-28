import { Injectable, computed, signal } from '@angular/core';
import {ALL_DIFFICULTIES,DEFAULT_ROUTE_FILTERS, MAX_ALTITUDE_METERS,RouteFilters } from '../utils/route-filter';
import type { RouteDifficulty } from './gpx.service';
import type { LatLon } from './route-planner.service';

@Injectable({
  providedIn: 'root',
})
export class RouteFilterService {
  readonly center = signal<LatLon | null>(DEFAULT_ROUTE_FILTERS.center);
  readonly radiusKm = signal(DEFAULT_ROUTE_FILTERS.radiusKm);
  readonly difficulties = signal<RouteDifficulty []>([...DEFAULT_ROUTE_FILTERS.difficulties]);
  readonly maxAltitude = signal(DEFAULT_ROUTE_FILTERS.maxAltitude);
  readonly totKm= signal<number|null>(DEFAULT_ROUTE_FILTERS.totKm);
  readonly time= signal<number|null>(DEFAULT_ROUTE_FILTERS.time);

  /** All the filters together: the map reads this one */
  readonly filters = computed<RouteFilters>(() => ({
    center: this.center(),
    radiusKm: this.radiusKm(),
    difficulties: this.difficulties(),
    maxAltitude: this.maxAltitude(),
    totKm: this.totKm(),
    time: this.time()

  }));

  setCenter(center: LatLon | null): void {
    this.center.set(center);
  }

  setRadius(km: number): void {
    this.radiusKm.set(km);
  }
  // true while the next click on the map chooses the center of the radius
   readonly pickingCenter = signal(false);

   startPickingCenter(): void {
    this.pickingCenter.set(true);
   }
   // turns the radius filter off
   clearCenter(): void{
    this.center.set(null);
    this.pickingCenter.set(false);
   }
   // turn a difficulty button off if it is on, and on if it is off
  toggleDifficulty(difficulty: RouteDifficulty): void {
    this.difficulties.update((current)=> current.includes(difficulty)
    ? current.filter((d) => d !== difficulty)
    : [...current,difficulty]);
  }
  // the altitude is kept between 0 and maximum of the slider
  setMaxAltitude(meters: number): void {
    this.maxAltitude.set(Math.min(Math.max(meters, 0), MAX_ALTITUDE_METERS));
  }
  //maximum length in km (null: no limit)
  setTotKm(km: number | null): void{
    this.totKm.set(km);
  }
  //maximum time in hours (null: no limit)
  setTime(hours: number|null): void{
    this.time.set(hours);
  }

  reset(): void {
    this.center.set(DEFAULT_ROUTE_FILTERS.center);
    this.radiusKm.set(DEFAULT_ROUTE_FILTERS.radiusKm);
    this.difficulties.set([...ALL_DIFFICULTIES]);
    this.maxAltitude.set(DEFAULT_ROUTE_FILTERS.maxAltitude);
    this.totKm.set(DEFAULT_ROUTE_FILTERS.totKm);
    this.time.set(DEFAULT_ROUTE_FILTERS.time);
  }
}