import { Injectable, computed, signal } from '@angular/core';
import {
  DEFAULT_ROUTE_FILTERS,
  MAX_ALTITUDE_METERS,
  MIN_ALTITUDE_METERS,
  RouteFilters,
} from '../utils/route-filter';
import type { RouteDifficulty } from './gpx.service';
import type { LatLon } from './route-planner.service';

@Injectable({
  providedIn: 'root',
})
export class RouteFilterService {
  readonly center = signal<LatLon | null>(DEFAULT_ROUTE_FILTERS.center);
  readonly radiusKm = signal(DEFAULT_ROUTE_FILTERS.radiusKm);
  readonly difficulty = signal<RouteDifficulty | null>(DEFAULT_ROUTE_FILTERS.difficulty);
  readonly minAltitude = signal(DEFAULT_ROUTE_FILTERS.minAltitude);
  readonly maxAltitude = signal(DEFAULT_ROUTE_FILTERS.maxAltitude);

  /** All the filters together: the map reads this one */
  readonly filters = computed<RouteFilters>(() => ({
    center: this.center(),
    radiusKm: this.radiusKm(),
    difficulty: this.difficulty(),
    minAltitude: this.minAltitude(),
    maxAltitude: this.maxAltitude(),
  }));

  setCenter(center: LatLon | null): void {
    this.center.set(center);
  }

  setRadius(km: number): void {
    this.radiusKm.set(km);
  }

  toggleDifficulty(difficulty: RouteDifficulty): void {
    this.difficulty.set(this.difficulty() === difficulty ? null : difficulty);
  }

  setMinAltitude(meters: number): void {
    this.minAltitude.set(Math.min(Math.max(meters, MIN_ALTITUDE_METERS), this.maxAltitude()));
  }

  setMaxAltitude(meters: number): void {
    this.maxAltitude.set(Math.max(Math.min(meters, MAX_ALTITUDE_METERS), this.minAltitude()));
  }

  reset(): void {
    this.center.set(DEFAULT_ROUTE_FILTERS.center);
    this.radiusKm.set(DEFAULT_ROUTE_FILTERS.radiusKm);
    this.difficulty.set(DEFAULT_ROUTE_FILTERS.difficulty);
    this.minAltitude.set(DEFAULT_ROUTE_FILTERS.minAltitude);
    this.maxAltitude.set(DEFAULT_ROUTE_FILTERS.maxAltitude);
  }
}