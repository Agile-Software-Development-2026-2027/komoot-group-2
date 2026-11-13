import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Sidebar } from './sidebar';
import { SidebarService } from '../services/sidebar.service';
import { RoutePlannerService } from '../services/route-planner.service';
import { OPEN_METEO_ELEVATION_URL } from '../services/elevation.service';
import { GpxTrack } from '../services/gpx.service';
import { TrackStyleHandler } from '../services/track-style-handler.service';

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
      { lat: 45.9, lon: 7.8, photos: ['photo-a.jpg', 'photo-b.jpg'] },
      { lat: 45.92, lon: 7.82, photos: ['photo-a.jpg'] },
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

  it('should customize the color and thickness of the routes with "Custom Route"', async () => {
    const trackStyle = TestBed.inject(TrackStyleHandler);
    sidebar.showTrack({ ...GPX_TRACK }, []);
    await fixture.whenStable();

    const swatch = host.querySelector<HTMLElement>('.track-line-swatch')!;
    expect(host.querySelector('.track-style-label')?.textContent).toContain('Color category hiking');
    expect(swatch.style.backgroundColor).toBe('rgb(16, 185, 129)'); // #10b981
    expect(host.querySelector('.customize-panel')).toBeNull();

    host.querySelector<HTMLButtonElement>('.btn-primary')!.click();
    await fixture.whenStable();

    const colorInput = host.querySelector<HTMLInputElement>('.customize-panel input[type=color]')!;
    const weightInput = host.querySelector<HTMLInputElement>('.customize-panel input[type=range]')!;
    expect(colorInput.value).toBe('#10b981'); // the route's current color, not the default red

    weightInput.value = '8';
    weightInput.dispatchEvent(new Event('input'));
    colorInput.value = '#123456';
    colorInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(trackStyle.getCurrentStyle()).toEqual({ color: '#123456', weight: 8 });
    expect(host.querySelector('.customize-panel')?.textContent).toContain('Thickness: 8 px');
    expect(swatch.style.height).toBe('8px');
  });
});
