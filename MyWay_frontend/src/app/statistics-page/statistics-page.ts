import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { StatisticsService } from '../services/statistics.service';
import { formatDistance, formatDuration } from '../utils/route-stats';

interface PieSlice {
  label: string;
  count: number;
  percent: number;
  color: string;
}

const PALETTE = ['#2563eb', '#10b981', '#f97316', '#8b5cf6', '#eab308', '#ef4444'];

function toSlices(counts: Partial<Record<string, number>>, labels: Record<string, string>): PieSlice[] {
  const entries = Object.entries(counts).filter((e): e is [string, number] => (e[1] ?? 0) > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([key, count], i) => ({
      label: labels[key] ?? key,
      count,
      percent: Math.round((count / total) * 100),
      color: PALETTE[i % PALETTE.length],
    }));
}

/** CSS conic-gradient drawing the slices as a pie. */
function toGradient(slices: PieSlice[]): string {
  const total = slices.reduce((s, x) => s + x.count, 0);
  let acc = 0;
  const stops = slices.map((s) => {
    const from = (acc / total) * 100;
    acc += s.count;
    return `${s.color} ${from}% ${(acc / total) * 100}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

const ROUTE_LABELS = { hiking: 'Hiking', cycling: 'Cycling', running: 'Running', walking: 'Walking' };
const DIFFICULTY_LABELS = { easy: 'Easy', intermediate: 'Intermediate', hard: 'Hard' };
const WAYPOINT_LABELS = {
  fountain: 'Fountain',
  shelter: 'Shelter',
  'panoramic view': 'Panoramic view',
  sanctuary: 'Sanctuary',
  peak: 'Peak',
};

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.css',
})
export class StatisticsPage {
  protected readonly auth = inject(AuthService);
  protected readonly statisticsService = inject(StatisticsService);

  protected readonly stats = this.statisticsService.statistics;

  protected readonly cards = computed(() => {
    const s = this.stats();
    const n = s.tripCount || 1;
    return [
      { title: 'Elapsed time', total: formatDuration(s.totalDurationSeconds), average: formatDuration(s.totalDurationSeconds / n) },
      { title: 'Distance', total: formatDistance(s.totalDistanceMeters), average: formatDistance(s.totalDistanceMeters / n) },
      { title: 'Elevation gain', total: `${Math.round(s.totalElevationGainMeters)} m`, average: `${Math.round(s.totalElevationGainMeters / n)} m` },
    ];
  });

  protected readonly charts = computed(() => {
    const s = this.stats();
    return [
      { title: 'Route types', slices: toSlices(s.routeTypes, ROUTE_LABELS) },
      { title: 'Difficulty', slices: toSlices(s.difficulties, DIFFICULTY_LABELS) },
      { title: 'Visited waypoints', slices: toSlices(s.waypointCategories, WAYPOINT_LABELS) },
    ].map((c) => ({ ...c, gradient: c.slices.length ? toGradient(c.slices) : '' }));
  });

  protected openLogin(): void {
    this.auth.requestLogin();
  }
}
