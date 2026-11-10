export interface ElevationStats {
  maxMeters: number;
  minMeters: number;
  ascentMeters: number;
  descentMeters: number;
}

/**
 * Elevation changes smaller than this are treated as GPS/terrain-model noise, so that
 * jitter on flat ground is not counted as climbing.
 */
export const ELEVATION_NOISE_THRESHOLD_METERS = 3;

/**
 * Computes max/min altitude and total ascent/descent of an ordered elevation profile.
 * Returns null when the profile contains no valid elevation.
 */
export function computeElevationStats(elevations: readonly (number | null | undefined)[]): ElevationStats | null {
  const values = elevations.filter((e): e is number => typeof e === 'number' && Number.isFinite(e));
  if (values.length === 0) return null;

  let max = values[0];
  let min = values[0];
  let ascent = 0;
  let descent = 0;
  // Hysteresis: only count a change once it exceeds the noise threshold from the last counted level
  let reference = values[0];

  for (const ele of values) {
    if (ele > max) max = ele;
    if (ele < min) min = ele;

    const diff = ele - reference;
    if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD_METERS) {
      if (diff > 0) ascent += diff;
      else descent -= diff;
      reference = ele;
    }
  }

  return {
    maxMeters: Math.round(max),
    minMeters: Math.round(min),
    ascentMeters: Math.round(ascent),
    descentMeters: Math.round(descent),
  };
}

/** Picks at most `maxCount` items spread evenly over the list, always keeping the first and the last. */
export function sampleEvenly<T>(items: readonly T[], maxCount: number): T[] {
  if (items.length <= maxCount) return [...items];
  if (maxCount <= 1) return items.slice(0, maxCount);

  const step = (items.length - 1) / (maxCount - 1);
  return Array.from({ length: maxCount }, (_, i) => items[Math.round(i * step)]);
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}
