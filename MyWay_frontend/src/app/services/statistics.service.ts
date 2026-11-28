import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { STATISTICS_ENDPOINT } from '../config/api.config';
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

/** Statistics as returned by the backend (enum names as keys). */
interface UserStatisticsResponse {
  tripCount: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalElevationGainMeters: number;
  routeTypes: Record<string, number>;
  difficulties: Record<string, number>;
  waypointCategories: Record<string, number>;
}

const EMPTY_STATISTICS: UserStatistics = computeStatistics([]);

/** Backend enum name (HIKING, PANORAMIC_VIEW, MEDIUM...) -> frontend key. */
function mapKeys<T extends string>(counts: Record<string, number>, rename: Record<string, T> = {}): Partial<Record<T, number>> {
  const result: Partial<Record<T, number>> = {};
  for (const [key, n] of Object.entries(counts ?? {})) {
    const k = (rename[key] ?? key.toLowerCase().replace(/_/g, ' ')) as T;
    result[k] = n;
  }
  return result;
}

/** Statistics of the routes saved in the user's folders, computed by the backend. */
@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly http = inject(HttpClient);

  readonly statistics = signal<UserStatistics>(EMPTY_STATISTICS);
  readonly loading = signal(false);
  readonly error = signal(false);

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<UserStatisticsResponse>(STATISTICS_ENDPOINT).subscribe({
      next: (r) => {
        this.statistics.set({
          tripCount: r.tripCount,
          totalDurationSeconds: r.totalDurationSeconds,
          totalDistanceMeters: r.totalDistanceMeters,
          totalElevationGainMeters: r.totalElevationGainMeters,
          routeTypes: mapKeys<RouteCategory>(r.routeTypes),
          difficulties: mapKeys<RouteDifficulty>(r.difficulties, { MEDIUM: 'intermediate' }),
          waypointCategories: mapKeys<WaypointCategory>(r.waypointCategories),
        });
        this.loading.set(false);
      },
      error: () => {
        this.statistics.set(EMPTY_STATISTICS);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
