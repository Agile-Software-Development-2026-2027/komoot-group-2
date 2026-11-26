import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar } from './sidebar';
import { ROUTE_ENDPOINTS } from '../config/api.config';
import { OPEN_METEO_GEOCODING_URL } from '../services/geocoding.service';
import { SidebarService } from '../services/sidebar.service';
import { RoutePlannerService } from '../services/route-planner.service';
import { OPEN_METEO_ELEVATION_URL } from '../services/elevation.service';
import { GpxTrack } from '../services/gpx.service';

const GPX_TRACK: GpxTrack = {
  name: 'Monte Rosa loop',
  category: 'hiking',
  difficulty: 'intermediate',
  color: '#10b981',
  distanceMeters: 12345,
  estimatedDurationSeconds: 11100,
  segments: [{ points: [[45.9, 7.8], [45.91, 7.81], [45.92, 7.82]], elevations: [1800, 2250, 2100] }],
};

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;
  let sidebar: SidebarService;
  let http: HttpTestingController;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    sidebar = TestBed.inject(SidebarService);
    http = TestBed.inject(HttpTestingController);
    host = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const panel = () => host.querySelector<HTMLElement>('.sidebar-panel')!;
  const toggle = () => host.querySelector<HTMLButtonElement>('.sidebar-toggle')!;
  const statValues = () =>
    Array.from(host.querySelectorAll('.stat')).map((el) => [
      el.querySelector('.stat-label')?.textContent?.trim(),
      el.querySelector('.stat-value')?.textContent?.trim(),
    ]);

  it('should only show the toggle icon while closed', () => {
    expect(toggle().classList).not.toContain('hidden');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(panel().classList).not.toContain('open');
    expect(panel().hasAttribute('inert')).toBe(true);
  });

  it('should open when the icon is clicked and close with the close button', async () => {
    toggle().click();
    await fixture.whenStable();

    expect(sidebar.isOpen()).toBe(true);
    expect(panel().classList).toContain('open');
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(toggle().classList).toContain('hidden');

    host.querySelector<HTMLButtonElement>('.panel-close')!.click();
    await fixture.whenStable();

    expect(sidebar.isOpen()).toBe(false);
    expect(panel().classList).not.toContain('open');
  });

  it('should invite the user to pick a route while none is selected', () => {
    expect(host.querySelector('.empty-state')?.textContent).toContain('Click on a route on the map');
    expect(host.querySelector('.stats-grid')).toBeNull();
  });

  it('should show the stats and photos of a clicked GPX route', async () => {
    sidebar.showTrack(GPX_TRACK, [
      { lat: 45.9, lon: 7.8, photos: ['photo-a.jpg', 'photo-b.jpg'], isPublic: false },
      { lat: 45.92, lon: 7.82, photos: ['photo-a.jpg'], isPublic: false },
    ]);
    await fixture.whenStable();

    expect(panel().classList).toContain('open');
    expect(host.querySelector('.route-name')?.textContent).toContain('Monte Rosa loop');
    expect(host.querySelector('.difficulty-badge')?.textContent).toContain('intermediate');
    expect(statValues()).toEqual([
      ['Distance', '12.3 km'],
      ['Estimated time', '3 h 5 min'],
      ['Max altitude', '2,250 m'],
      ['Min altitude', '1,800 m'],
      ['Ascent', '450 m'],
      ['Descent', '150 m'],
    ]);
    expect(host.querySelector('.stats-note')).toBeNull(); // elevation comes from the file

    const photos = host.querySelectorAll<HTMLButtonElement>('.photo-btn');
    expect(photos).toHaveLength(2);
    photos[1].click();
    await fixture.whenStable();
    expect(host.querySelector<HTMLImageElement>('.photo-lightbox-img')?.getAttribute('src')).toBe('photo-b.jpg');
  });

  it('should show the stats of a created route once its elevation is loaded', async () => {
    TestBed.inject(RoutePlannerService).route.set({
      points: [
        { lat: 41.89, lon: 12.49 },
        { lat: 41.9, lon: 12.45 },
      ],
      distanceMeters: 4093.9,
      durationSeconds: 3276.4,
    });
    await fixture.whenStable();

    expect(host.querySelector('.route-caption')?.textContent).toContain('Created route');
    expect(host.querySelectorAll('.skeleton')).toHaveLength(4);

    http.expectOne((req) => req.url === OPEN_METEO_ELEVATION_URL).flush({ elevation: [21, 48] });
    await fixture.whenStable();

    expect(statValues()).toEqual([
      ['Distance', '4.1 km'],
      ['Estimated time', '55 min'],
      ['Max altitude', '48 m'],
      ['Min altitude', '21 m'],
      ['Ascent', '27 m'],
      ['Descent', '0 m'],
    ]);
    expect(host.querySelector('.stats-note')?.textContent).toContain('Open-Meteo');
    expect(host.querySelector('.photos-grid')).toBeNull();
  });

  it('should customize the color and thickness of the routes with "Custom Route" modal', async () => {
    const track: GpxTrack = { ...GPX_TRACK };
    sidebar.showTrack(track, []);
    await fixture.whenStable();

    const swatch = host.querySelector<HTMLElement>('.track-line-swatch')!;
    expect(host.querySelector('.track-style-label')?.textContent).toContain('Color category hiking');
    expect(swatch.style.backgroundColor).toBe('rgb(16, 185, 129)'); // #10b981
    expect(host.querySelector('.edit-modal-card')).toBeNull();

    host.querySelector<HTMLButtonElement>('.btn-primary')!.click();
    await fixture.whenStable();

    expect(host.querySelector('.edit-modal-card')).toBeTruthy();
    const colorInput = host.querySelector<HTMLInputElement>('.edit-modal-card input[type=color]')!;
    const weightInput = host.querySelector<HTMLInputElement>('.edit-modal-card input[type=range]')!;
    expect(colorInput.value).toBe('#10b981'); // the route's current color, not the default red

    weightInput.value = '8';
    weightInput.dispatchEvent(new Event('input'));
    colorInput.value = '#123456';
    colorInput.dispatchEvent(new Event('input'));

    host.querySelector<HTMLButtonElement>('.btn-modal-save')!.click();
    await fixture.whenStable();

    expect(host.querySelector('.edit-modal-card')).toBeNull();
    expect(track.color).toBe('#123456');
    expect(track.weight).toBe(8);
    expect(swatch.style.height).toBe('8px');
    expect(swatch.style.backgroundColor).toBe('rgb(18, 52, 86)');
  });

  describe('route search', () => {
    afterEach(() => vi.useRealTimers());

    it('should show a search bar in the sidebar and display matching routes in a list while typing', () => {
      vi.useFakeTimers();
      sidebar.open();
      fixture.detectChanges();

      const input = host.querySelector<HTMLInputElement>('.search-input')!;
      expect(input).toBeTruthy();

      input.value = 'Vesuvio';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);

      const searchReq = http.expectOne((req) => req.url === ROUTE_ENDPOINTS.search);
      expect(searchReq.request.params.get('q')).toBe('Vesuvio');
      const geoReq = http.expectOne((req) => req.url === OPEN_METEO_GEOCODING_URL);

      searchReq.flush([
        {
          id: 11,
          name: 'Monte Vesuvio Trail',
          category: 'HIKING',
          difficulty: 'MEDIUM',
          distanceMeters: 6400,
          estimatedTimeInMinutes: 110,
          publisherUsername: 'mario',
          pictureUrl: null,
          publicRoute: true,
          reported: false,
        },
      ]);
      geoReq.flush({ results: [] });
      fixture.detectChanges();

      const items = host.querySelectorAll('.search-route-item');
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Monte Vesuvio Trail');
      expect(items[0].textContent).toContain('mario');
      // Only shown in the list so far, not focused on the map yet
      expect(sidebar.focusedPublicRoute()).toBeNull();
    });

    it('should list all routes in a selected place and focus a route on the map when clicked', () => {
      vi.useFakeTimers();
      sidebar.open();
      fixture.detectChanges();

      const input = host.querySelector<HTMLInputElement>('.search-input')!;
      input.value = 'Napoli';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);

      http.expectOne((req) => req.url === ROUTE_ENDPOINTS.search).flush([]);
      http.expectOne((req) => req.url === OPEN_METEO_GEOCODING_URL).flush({
        results: [
          {
            id: 101,
            name: 'Naples',
            latitude: 40.85,
            longitude: 14.27,
            country_code: 'IT',
            admin1: 'Campania',
            country: 'Italy',
          },
        ],
      });
      fixture.detectChanges();

      const placeBtn = host.querySelector<HTMLButtonElement>('.search-place-item')!;
      expect(placeBtn.textContent).toContain('Naples');
      placeBtn.click();

      const nearbyReq = http.expectOne((req) => req.url === ROUTE_ENDPOINTS.nearby);
      expect(nearbyReq.request.params.get('lat')).toBe('40.85');
      expect(nearbyReq.request.params.get('lon')).toBe('14.27');
      expect(nearbyReq.request.params.get('radiusKm')).toBe('25');

      nearbyReq.flush([
        {
          id: 42,
          name: 'Posillipo Loop',
          category: 'WALKING',
          difficulty: 'EASY',
          distanceMeters: 4200,
          estimatedTimeInMinutes: 60,
          publisherUsername: 'elena',
          pictureUrl: null,
          startLatitude: 40.81,
          startLongitude: 14.21,
          distanceFromUserKm: 4.5,
        },
      ]);
      fixture.detectChanges();

      const routeBtn = host.querySelector<HTMLButtonElement>('.search-route-item')!;
      expect(routeBtn.textContent).toContain('Posillipo Loop');
      expect(routeBtn.textContent).toContain('4.5 km away');
      expect(sidebar.focusedPublicRoute()).toBeNull();

      routeBtn.click();
      http.expectOne(ROUTE_ENDPOINTS.publicDetails(42)).flush({
        route: {
          id: 42,
          name: 'Posillipo Loop',
          category: 'WALKING',
          difficulty: 'EASY',
          distanceMeters: 4200,
          estimatedTimeInMinutes: 60,
          publisherUsername: 'elena',
          pictureUrl: null,
          publicRoute: true,
          reported: false,
        },
        points: [
          { latitude: 40.81, longitude: 14.21, elevation: 50, name: null },
          { latitude: 40.82, longitude: 14.22, elevation: 95, name: null },
        ],
      });
      fixture.detectChanges();

      expect(sidebar.focusedPublicRoute()?.details.route.id).toBe(42);
      expect(host.querySelector('.route-name')?.textContent).toContain('Posillipo Loop');
    });
  });
});
