import { Injectable, computed, signal } from '@angular/core';
import { RouteCategory, RouteDifficulty, WaypointCategory } from './gpx.service';

/** A completed route of the user (only the fields the statistics need). */
export interface CompletedRoute {
  category: RouteCategory;
  difficulty: RouteDifficulty;
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  /** Categories of the waypoints visited along the route. */
  waypointCategories: WaypointCategory[];
}

export interface UserStatistics {
  tripCount: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalElevationGainMeters: number;
  routeTypes: Partial<Record<RouteCategory, number>>;
  difficulties: Partial<Record<RouteDifficulty, number>>;
  waypointCategories: Partial<Record<WaypointCategory, number>>;
}

function countBy<T extends string>(values: T[]): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const v of values) result[v] = (result[v] ?? 0) + 1;
  return result;
}

/** Aggregates the completed routes into the numbers shown in the Statistics page. */
export function computeStatistics(routes: readonly CompletedRoute[]): UserStatistics {
  return {
    tripCount: routes.length,
    totalDurationSeconds: routes.reduce((s, r) => s + r.durationSeconds, 0),
    totalDistanceMeters: routes.reduce((s, r) => s + r.distanceMeters, 0),
    totalElevationGainMeters: routes.reduce((s, r) => s + r.elevationGainMeters, 0),
    routeTypes: countBy(routes.map((r) => r.category)),
    difficulties: countBy(routes.map((r) => r.difficulty)),
    waypointCategories: countBy(routes.flatMap((r) => r.waypointCategories)),
  };
}

/**
 * Source of the user's statistics. There is no backend yet: the list of completed routes is
 * empty until the data is loaded from the server.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsService {
  readonly completedRoutes = signal<CompletedRoute[]>([]);
  readonly statistics = computed(() => computeStatistics(this.completedRoutes()));
}
