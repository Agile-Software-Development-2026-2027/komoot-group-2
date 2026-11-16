import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTE_ENDPOINTS } from '../config/api.config';
import { GpxService } from './gpx.service';
import { RouteFilterService } from './route-filter.service';
import {
  NOMINATIM_SEARCH_URL,
  PagedRoutesDTO,
  PublicRouteDTO,
  RouteSearchService,
} from './route-search.service';
import { SidebarService } from './sidebar.service';

const SAMPLE_DTOS: PublicRouteDTO[] = [
  {
    id: 1,
    name: 'Tre Cime di Lavaredo Loop',
    category: 'HIKING',
    difficulty: 'MEDIUM',
    publisherUsername: 'marco_alp',
    estimatedTimeInMinutes: 147,
    lengthInMeters: 9800,
    gpxData: {
      tracks: [
        {
          name: 'Tre Cime di Lavaredo Loop',
          points: [
            { latitude: 46.6125, longitude: 12.2961, elevation: 2320 },
            { latitude: 46.6305, longitude: 12.3097, elevation: 2405 },
          ],
        },
      ],
      waypoints: [
        { latitude: 46.6125, longitude: 12.2961, elevation: 2320, name: 'Rifugio Auronzo' },
      ],
    },
  },
  {
    id: 2,
    name: 'Via Appia Antica Ride',
    category: 'CYCLING',
    difficulty: 'EASY',
    publisherUsername: 'luca_roma',
    estimatedTimeInMinutes: 45,
    lengthInMeters: 11200,
    gpxData: {
      tracks: [
        {
          name: 'Via Appia Antica Ride',
          points: [
            { latitude: 41.8722, longitude: 12.5015, elevation: 45 },
            { latitude: 41.8565, longitude: 12.5184, elevation: 58 },
          ],
        },
      ],
      waypoints: [],
    },
  },
];

describe('RouteSearchService', () => {
  let service: RouteSearchService;
  let gpxService: GpxService;
  let sidebarService: SidebarService;
  let routeFilterService: RouteFilterService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RouteSearchService);
    gpxService = TestBed.inject(GpxService);
    sidebarService = TestBed.inject(SidebarService);
    routeFilterService = TestBed.inject(RouteFilterService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should start with no hardcoded routes and no active search', () => {
    expect(service.routes()).toEqual([]);
    expect(service.isSearching()).toBe(false);
    expect(service.results()).toEqual([]);
  });

  it('should fetch paginated public routes and place suggestions from the single search bar without rendering on the map', () => {
    const displaySpy = vi.spyOn(gpxService, 'displayParsedGpx');

    service.setQuery('Tre Cime');

    const pagedResponse: PagedRoutesDTO = {
      content: [SAMPLE_DTOS[0]],
      page: 0,
      size: 5,
      totalElements: 1,
      totalPages: 1,
    };
    http
      .expectOne((req) => req.url === ROUTE_ENDPOINTS.publicRoutes && req.params.get('q') === 'Tre Cime')
      .flush(pagedResponse);
    http
      .expectOne((req) => req.url === NOMINATIM_SEARCH_URL && req.params.get('q') === 'Tre Cime')
      .flush([]);

    expect(service.isSearching()).toBe(true);
    expect(service.paginatedResults()).toHaveLength(1);
    expect(service.paginatedResults()[0].name).toBe('Tre Cime di Lavaredo Loop');
    expect(displaySpy).not.toHaveBeenCalled();
  });

  it('should filter routes in a specific place when a place suggestion is selected', () => {
    service.setQuery('Rome');

    http
      .expectOne((req) => req.url === ROUTE_ENDPOINTS.publicRoutes && req.params.get('q') === 'Rome')
      .flush({ content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 });
    http
      .expectOne((req) => req.url === NOMINATIM_SEARCH_URL && req.params.get('q') === 'Rome')
      .flush([{ display_name: 'Rome, Italy', lat: '41.8902', lon: '12.4922' }]);

    expect(service.placeSuggestions()).toHaveLength(1);
    service.selectPlaceSuggestion(service.placeSuggestions()[0]);

    http
      .expectOne((req) => req.url === ROUTE_ENDPOINTS.publicRoutes && req.params.get('size') === '50')
      .flush({ content: SAMPLE_DTOS, page: 0, size: 50, totalElements: 2, totalPages: 1 });

    expect(routeFilterService.center()).toEqual({ lat: 41.8902, lon: 12.4922 });
    expect(service.paginatedResults().map((r) => r.name)).toEqual(['Via Appia Antica Ride']);
  });

  it('should paginate search results across pages', () => {
    service.pageSize.set(2);
    service.setRoutes(
      Array.from({ length: 5 }, (_, i) => ({
        id: String(i + 1),
        name: `Trail ${i + 1}`,
        place: 'Dolomites',
        author: 'user',
        track: { name: `Trail ${i + 1}`, segments: [{ points: [[46.6, 12.3]] }] },
        waypoints: [],
      })),
    );

    service.setQuery('Trail');
    http.expectOne((req) => req.url === NOMINATIM_SEARCH_URL).flush([]);

    expect(service.totalPages()).toBe(3);
    expect(service.paginatedResults().map((r) => r.name)).toEqual(['Trail 1', 'Trail 2']);

    service.nextPage();
    expect(service.currentPage()).toBe(1);
    expect(service.paginatedResults().map((r) => r.name)).toEqual(['Trail 3', 'Trail 4']);

    service.nextPage();
    expect(service.currentPage()).toBe(2);
    expect(service.paginatedResults().map((r) => r.name)).toEqual(['Trail 5']);

    service.prevPage();
    expect(service.currentPage()).toBe(1);
  });

  it('should display the route on the map and show its stats when a route is selected', () => {
    const displaySpy = vi.spyOn(gpxService, 'displayParsedGpx');
    const showTrackSpy = vi.spyOn(sidebarService, 'showTrack');

    service.loadPublicRoutes();
    http.expectOne((req) => req.url === ROUTE_ENDPOINTS.publicRoutes).flush(SAMPLE_DTOS);

    const route = service.routes()[0];
    service.selectRoute(route);

    expect(displaySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tracks: [route.track],
        waypoints: route.waypoints,
      }),
    );
    expect(showTrackSpy).toHaveBeenCalledWith(route.track, route.waypoints);
  });
});
