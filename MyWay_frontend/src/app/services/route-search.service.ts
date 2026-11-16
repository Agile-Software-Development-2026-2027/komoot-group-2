import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ROUTE_ENDPOINTS } from '../config/api.config';
import { matchTrack } from '../utils/route-filter';
import {
  GpxService,
  GpxTrack,
  GpxTrackSegment,
  GpxWaypoint,
  ParsedGpx,
  RouteCategory,
  RouteDifficulty,
} from './gpx.service';
import { RouteFilterService } from './route-filter.service';
import { SidebarService } from './sidebar.service';

export const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
export const DEFAULT_SEARCH_PAGE_SIZE = 5;

export interface BackendPointDTO {
  latitude: number;
  longitude: number;
  elevation?: number | null;
  name?: string | null;
}

export interface BackendRouteDTO {
  name?: string | null;
  points: BackendPointDTO[];
}

export interface BackendGpxDataDTO {
  waypoints?: BackendPointDTO[];
  routes?: BackendRouteDTO[];
  tracks?: BackendRouteDTO[];
}

export interface PublicRouteDTO {
  id: number;
  name: string;
  category: string;
  difficulty: string;
  publisherEmail?: string | null;
  publisherUsername?: string | null;
  estimatedTimeInMinutes?: number | null;
  lengthInMeters?: number | null;
  gpxData?: BackendGpxDataDTO | null;
}

export interface PagedRoutesDTO {
  content: PublicRouteDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PlaceSuggestion {
  displayName: string;
  lat: number;
  lon: number;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
}

export interface SearchableRoute {
  id: string;
  name: string;
  place?: string;
  author: string;
  track: GpxTrack;
  waypoints: GpxWaypoint[];
}

@Injectable({
  providedIn: 'root',
})
export class RouteSearchService {
  private readonly http = inject(HttpClient);
  private readonly gpxService = inject(GpxService);
  private readonly sidebarService = inject(SidebarService);
  private readonly routeFilterService = inject(RouteFilterService);

  readonly routes = signal<SearchableRoute[]>([]);
  readonly query = signal<string>('');
  readonly selectedPlaceName = signal<string | null>(null);
  readonly placeSuggestions = signal<PlaceSuggestion[]>([]);
  readonly loading = signal<boolean>(false);
  readonly activeRouteId = signal<string | null>(null);

  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(DEFAULT_SEARCH_PAGE_SIZE);
  private readonly serverTotalPages = signal<number | null>(null);
  private readonly serverTotalElements = signal<number | null>(null);

  private routesSub?: Subscription;
  private placeSub?: Subscription;
  private hasLoadedOnce = false;

  /** Distinct place labels available on loaded routes */
  readonly places = computed<string[]>(() =>
    Array.from(
      new Set(
        this.routes()
          .map((r) => r.place)
          .filter((p): p is string => !!p),
      ),
    ),
  );

  /** True when the user is typing in the search bar or filtering by a specific place */
  readonly isSearching = computed<boolean>(
    () =>
      this.query().trim().length > 0 ||
      this.selectedPlaceName() !== null ||
      this.routeFilterService.center() !== null,
  );

  /** All routes matching the current search query and/or specific place (shown in list, not on map) */
  readonly results = computed<SearchableRoute[]>(() => {
    const q = this.query().trim().toLowerCase();
    const placeName = this.selectedPlaceName()?.toLowerCase() ?? null;
    const filters = this.routeFilterService.filters();

    if (!q && !placeName && !filters.center) {
      return [];
    }

    return this.routes().filter((route) => {
      if (filters.center) {
        return matchTrack(route.track, filters) !== 'hidden';
      }

      if (placeName) {
        const matchesPlace =
          route.place?.toLowerCase() === placeName ||
          route.name.toLowerCase().includes(placeName);
        if (!matchesPlace) {
          return false;
        }
        if (!q || q === placeName) {
          return true;
        }
      }

      if (!q) {
        return true;
      }

      return (
        route.name.toLowerCase().includes(q) ||
        (route.place?.toLowerCase().includes(q) ?? false) ||
        route.author.toLowerCase().includes(q) ||
        (route.track.category?.toLowerCase().includes(q) ?? false)
      );
    });
  });

  /** Total number of matching routes */
  readonly totalElements = computed<number>(() => {
    const serverTotal = this.serverTotalElements();
    if (serverTotal !== null && !this.routeFilterService.center() && !this.selectedPlaceName()) {
      return serverTotal;
    }
    return this.results().length;
  });

  /** Total number of pages for the current search results */
  readonly totalPages = computed<number>(() => {
    const serverPages = this.serverTotalPages();
    if (serverPages !== null && !this.routeFilterService.center() && !this.selectedPlaceName()) {
      return Math.max(serverPages, this.results().length > 0 ? 1 : 0);
    }
    const size = Math.max(this.pageSize(), 1);
    return Math.ceil(this.results().length / size);
  });

  /** Current page slice of matching routes */
  readonly paginatedResults = computed<SearchableRoute[]>(() => {
    const all = this.results();
    if (this.serverTotalPages() !== null && !this.routeFilterService.center() && !this.selectedPlaceName()) {
      return all;
    }
    const size = Math.max(this.pageSize(), 1);
    const start = this.currentPage() * size;
    return all.slice(start, start + size);
  });

  /** Fetches public routes from the backend with pagination */
  loadPublicRoutes(query = this.query(), page = this.currentPage(), size = this.pageSize()): void {
    this.hasLoadedOnce = true;
    this.loading.set(true);
    this.routesSub?.unsubscribe();

    const params: Record<string, string> = {
      page: String(Math.max(page, 0)),
      size: String(Math.max(size, 1)),
    };
    if (query.trim()) {
      params['q'] = query.trim();
    }

    this.routesSub = this.http
      .get<PagedRoutesDTO | PublicRouteDTO[]>(ROUTE_ENDPOINTS.publicRoutes, { params })
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            this.serverTotalPages.set(null);
            this.serverTotalElements.set(null);
            this.routes.set(response.map((dto) => this.mapDtoToSearchableRoute(dto)));
          } else {
            this.currentPage.set(response.page);
            this.pageSize.set(response.size);
            this.serverTotalPages.set(response.totalPages);
            this.serverTotalElements.set(response.totalElements);
            this.routes.set((response.content ?? []).map((dto) => this.mapDtoToSearchableRoute(dto)));
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  setRoutes(routes: SearchableRoute[]): void {
    this.hasLoadedOnce = true;
    this.serverTotalPages.set(null);
    this.serverTotalElements.set(null);
    this.currentPage.set(0);
    this.routes.set([...routes]);
  }

  /**
   * Updates the unified search bar query:
   * - Filters routes live as the user types
   * - Looks up matching places so the user can view all routes in a specific place
   */
  setQuery(query: string): void {
    this.query.set(query);
    this.currentPage.set(0);
    this.selectedPlaceName.set(null);
    this.routeFilterService.setCenter(null);

    const trimmed = query.trim();
    if (!trimmed) {
      this.placeSuggestions.set([]);
      return;
    }

    if (!this.hasLoadedOnce || this.serverTotalPages() !== null) {
      this.loadPublicRoutes(trimmed, 0, this.pageSize());
    }

    this.lookupPlaceSuggestions(trimmed);
  }

  /** Navigate to a specific page (0-indexed) */
  goToPage(page: number): void {
    const total = this.totalPages();
    if (page < 0 || (total > 0 && page >= total)) {
      return;
    }
    this.currentPage.set(page);
    if (this.serverTotalPages() !== null && !this.routeFilterService.center() && !this.selectedPlaceName()) {
      this.loadPublicRoutes(this.query(), page, this.pageSize());
    }
  }

  nextPage(): void {
    if (this.currentPage() + 1 < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  /** Filter routes by a geocoded place coordinate using RouteFilterService to show all routes in that place */
  selectPlaceSuggestion(suggestion: PlaceSuggestion): void {
    this.selectedPlaceName.set(suggestion.displayName);
    this.query.set(suggestion.displayName);
    this.placeSuggestions.set([]);
    this.currentPage.set(0);
    this.routeFilterService.setCenter({ lat: suggestion.lat, lon: suggestion.lon });

    // Load all public routes so every route within the place radius is included
    if (this.serverTotalPages() !== null || !this.hasLoadedOnce) {
      this.loadPublicRoutes('', 0, 50);
    }
  }

  /** Filter routes to show all routes in a specific place label (or clear if clicked again) */
  togglePlace(place: string): void {
    if (!this.hasLoadedOnce) {
      this.loadPublicRoutes('', 0, 50);
    }
    const current = this.selectedPlaceName();
    this.routeFilterService.setCenter(null);
    this.placeSuggestions.set([]);
    this.currentPage.set(0);

    if (current === place) {
      this.selectedPlaceName.set(null);
    } else {
      this.selectedPlaceName.set(place);
    }
  }

  clearSearch(): void {
    this.routesSub?.unsubscribe();
    this.placeSub?.unsubscribe();
    this.query.set('');
    this.selectedPlaceName.set(null);
    this.placeSuggestions.set([]);
    this.currentPage.set(0);
    this.routeFilterService.setCenter(null);
  }

  /**
   * Renders the selected route on the map with a zoom effect and opens its stats in the sidebar.
   */
  selectRoute(route: SearchableRoute): void {
    this.activeRouteId.set(route.id);

    const allCoordinates = route.track.segments.flatMap((seg) => seg.points);
    const parsed: ParsedGpx = {
      fileName: `${route.id}.gpx`,
      waypoints: route.waypoints,
      tracks: [route.track],
      allCoordinates,
    };

    this.gpxService.displayParsedGpx(parsed);
    this.sidebarService.showTrack(route.track, route.waypoints);
  }

  private lookupPlaceSuggestions(query: string): void {
    this.placeSub?.unsubscribe();
    this.placeSub = this.http
      .get<NominatimItem[]>(NOMINATIM_SEARCH_URL, {
        params: {
          format: 'json',
          q: query,
          limit: '3',
        },
      })
      .subscribe({
        next: (items) => {
          const suggestions = items
            .map((item) => ({
              displayName: item.display_name,
              lat: Number.parseFloat(item.lat),
              lon: Number.parseFloat(item.lon),
            }))
            .filter((s) => !Number.isNaN(s.lat) && !Number.isNaN(s.lon));
          this.placeSuggestions.set(suggestions);
        },
        error: () => {
          this.placeSuggestions.set([]);
        },
      });
  }

  private mapDtoToSearchableRoute(dto: PublicRouteDTO): SearchableRoute {
    const category = this.mapCategory(dto.category);
    const difficulty = this.mapDifficulty(dto.difficulty);
    const rawTracks = dto.gpxData?.tracks?.length
      ? dto.gpxData.tracks
      : (dto.gpxData?.routes ?? []);

    const segments: GpxTrackSegment[] = rawTracks
      .map((t) => {
        const points: [number, number][] = t.points.map((pt) => [pt.latitude, pt.longitude]);
        const elevations = t.points.map((pt) => pt.elevation ?? null);
        return elevations.some((e) => e !== null) ? { points, elevations } : { points };
      })
      .filter((seg) => seg.points.length > 0);

    const waypoints: GpxWaypoint[] = (dto.gpxData?.waypoints ?? []).map((wp) => ({
      lat: wp.latitude,
      lon: wp.longitude,
      ...(wp.elevation != null ? { ele: wp.elevation } : {}),
      ...(wp.name ? { name: wp.name } : {}),
    }));

    const track: GpxTrack = {
      name: dto.name,
      category,
      difficulty,
      distanceMeters: dto.lengthInMeters ?? undefined,
      estimatedDurationSeconds:
        dto.estimatedTimeInMinutes != null ? dto.estimatedTimeInMinutes * 60 : undefined,
      segments,
    };

    return {
      id: String(dto.id),
      name: dto.name,
      author: dto.publisherUsername || dto.publisherEmail || 'user',
      track,
      waypoints,
    };
  }

  private mapCategory(raw?: string): RouteCategory {
    const lower = raw?.toLowerCase();
    if (lower === 'cycling' || lower === 'running' || lower === 'walking') {
      return lower;
    }
    return 'hiking';
  }

  private mapDifficulty(raw?: string): RouteDifficulty {
    const lower = raw?.toLowerCase();
    if (lower === 'easy') return 'easy';
    if (lower === 'hard') return 'hard';
    return 'intermediate';
  }
}
