import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';
import { GeocodingService, PlaceResult } from '../../services/geocoding.service';
import { GpxService } from '../../services/gpx.service';
import { NearbyRoute, PublishedRoute, RoutePublishingService } from '../../services/route-publishing.service';
import { SidebarService } from '../../services/sidebar.service';
import { formatDistance, formatDuration } from '../../utils/route-stats';

const PLACE_RADIUS_OPTIONS_KM = [10, 25, 50, 100];
const DEFAULT_PLACE_RADIUS_KM = 25;
const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'app-route-search',
  imports: [],
  templateUrl: './route-search.component.html',
  styleUrl: './route-search.component.css',
})
export class RouteSearchComponent {
  private readonly sidebar = inject(SidebarService);
  private readonly publishingService = inject(RoutePublishingService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly gpxService = inject(GpxService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchQuery = signal('');
  protected readonly isSearching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly routeResults = signal<PublishedRoute[]>([]);
  protected readonly placeResults = signal<PlaceResult[]>([]);
  protected readonly selectedPlace = signal<PlaceResult | null>(null);
  protected readonly placeRoutes = signal<NearbyRoute[]>([]);
  protected readonly placeRadiusKm = signal(DEFAULT_PLACE_RADIUS_KM);
  protected readonly placeRadiusOptions = PLACE_RADIUS_OPTIONS_KM;
  protected readonly isLoadingPlaceRoutes = signal(false);
  protected readonly loadingRouteId = signal<number | null>(null);

  protected readonly activePublicRouteId = computed(() => {
    const selected = this.sidebar.selectedRoute();
    return selected?.kind === 'public' ? selected.details.route.id : null;
  });

  private readonly searchInput$ = new Subject<string>();
  private placeRoutesRequest?: Subscription;
  private routeSelectRequest?: Subscription;

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query) {
            return of(null);
          }
          this.isSearching.set(true);
          this.searchError.set(null);
          let routeSearchFailed = false;
          return forkJoin({
            routes: this.publishingService.searchPublicRoutes(query).pipe(
              catchError(() => {
                routeSearchFailed = true;
                return of<PublishedRoute[]>([]);
              }),
            ),
            places: this.geocodingService.searchPlaces(query).pipe(
              catchError(() => of<PlaceResult[]>([])),
            ),
          }).pipe(map((result) => ({ ...result, routeSearchFailed })));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) return;
        this.isSearching.set(false);
        this.routeResults.set(result.routes);
        this.placeResults.set(result.places);
        this.searchError.set(
          result.routeSearchFailed ? 'Could not search routes right now. Try again later.' : null,
        );
      });

    // Drop a route from the search list as soon as it is reported
    effect(() => {
      const reportedId = this.sidebar.reportedRouteId();
      if (reportedId !== null) {
        untracked(() => {
          this.routeResults.update((list) => list.filter((r) => r.id !== reportedId));
          this.placeRoutes.update((list) => list.filter((r) => r.id !== reportedId));
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      this.placeRoutesRequest?.unsubscribe();
      this.routeSelectRequest?.unsubscribe();
    });
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (this.selectedPlace()) {
      this.clearSelectedPlace();
    }
    const trimmed = value.trim();
    if (!trimmed) {
      this.isSearching.set(false);
      this.searchError.set(null);
      this.routeResults.set([]);
      this.placeResults.set([]);
    }
    this.searchInput$.next(trimmed);
  }

  protected clearSearch(): void {
    this.onSearchInput('');
  }

  protected selectPlace(place: PlaceResult): void {
    this.selectedPlace.set(place);
    this.loadRoutesForPlace(place, this.placeRadiusKm());
  }

  protected setPlaceRadius(radiusKm: number): void {
    this.placeRadiusKm.set(radiusKm);
    const place = this.selectedPlace();
    if (place) {
      this.loadRoutesForPlace(place, radiusKm);
    }
  }

  protected clearSelectedPlace(): void {
    this.placeRoutesRequest?.unsubscribe();
    this.selectedPlace.set(null);
    this.placeRoutes.set([]);
    this.isLoadingPlaceRoutes.set(false);
    this.searchError.set(null);
  }

  private loadRoutesForPlace(place: PlaceResult, radiusKm: number): void {
    this.placeRoutesRequest?.unsubscribe();
    this.isLoadingPlaceRoutes.set(true);
    this.searchError.set(null);
    this.placeRoutesRequest = this.publishingService
      .getNearbyRoutes({ lat: place.latitude, lon: place.longitude }, radiusKm)
      .subscribe({
        next: (routes) => {
          this.isLoadingPlaceRoutes.set(false);
          this.placeRoutes.set(routes);
        },
        error: () => {
          this.isLoadingPlaceRoutes.set(false);
          this.placeRoutes.set([]);
          this.searchError.set('Could not load routes for this place. Try again later.');
        },
      });
  }

  protected selectSearchRoute(routeId: number): void {
    this.routeSelectRequest?.unsubscribe();
    this.loadingRouteId.set(routeId);
    this.routeSelectRequest = this.publishingService.getPublicRouteById(routeId).subscribe({
      next: (details) => {
        this.loadingRouteId.set(null);
        this.sidebar.focusPublicRoute(details);
      },
      error: () => {
        this.loadingRouteId.set(null);
        this.gpxService.showNotification({
          type: 'error',
          message: 'Could not load this route. Try again later.',
        });
      },
    });
  }

  protected formatRouteDistance(meters: number | null): string {
    return meters === null ? '—' : formatDistance(meters);
  }

  protected formatRouteTime(minutes: number | null): string {
    return minutes === null ? '—' : formatDuration(minutes * 60);
  }

  protected formatDifficulty(difficulty: string): string {
    const lower = difficulty.toLowerCase();
    return lower === 'medium' ? 'intermediate' : lower;
  }

  protected formatPlaceDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
  }
}
