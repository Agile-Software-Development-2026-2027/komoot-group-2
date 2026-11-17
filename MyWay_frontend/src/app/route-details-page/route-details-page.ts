import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { API_BASE_URL } from '../config/api.config';
import { RouteDetails, RoutePublishingService } from '../services/route-publishing.service';
import { formatDistance, formatDuration } from '../utils/route-stats';
import { AuthService } from '../services/auth.service';
import { GpxService } from '../services/gpx.service';

const CATEGORY_COLORS: Record<string, string> = {
  hiking: '#10b981',
  cycling: '#2563eb',
  running: '#f97316',
  walking: '#8b5cf6',
};

@Component({
  selector: 'app-route-details-page',
  imports: [RouterLink],
  templateUrl: './route-details-page.html',
  styleUrl: './route-details-page.css',
})
export class RouteDetailsPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private readonly publishingService = inject(RoutePublishingService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly gpxService = inject(GpxService);
  private routeId = 0;

  protected readonly isReporting = signal(false);

  protected readonly details = signal<RouteDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private map?: L.Map;
  private routeGroup?: L.FeatureGroup;

  constructor() {
    const id = Number(this.activatedRoute.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('This route does not exist.');
      this.loading.set(false);
      return;
    }

    this.routeId = id;

    this.publishingService.getPublicRouteById(id).subscribe({
      next: (data) => {
        this.details.set(data);
        this.loading.set(false);
        this.drawRoute();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.error.set('This route is not available anymore.');
        } else {
          this.error.set('Could not load the route. Try again later.');
        }
      },
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.map.setView([42.5, 12.5], 5);

    // The data may have arrived before the map was created
    this.drawRoute();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /** Draws the route once both the map and the data are available. */
  private drawRoute(): void {
    const data = this.details();
    if (!this.map || !data || data.points.length === 0) return;

    this.routeGroup?.remove();
    this.routeGroup = L.featureGroup().addTo(this.map);

    const latLngs = data.points.map((p): L.LatLngTuple => [p.latitude, p.longitude]);
    const color = CATEGORY_COLORS[data.route.category.toLowerCase()] ?? '#10b981';

    L.polyline(latLngs, { color, weight: 5, opacity: 0.9, lineJoin: 'round' }).addTo(this.routeGroup);
    L.circleMarker(latLngs[0], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#2e7d32', fillOpacity: 1 })
      .bindTooltip('Start')
      .addTo(this.routeGroup);
    L.circleMarker(latLngs[latLngs.length - 1], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#c62828',
      fillOpacity: 1,
    })
      .bindTooltip('End')
      .addTo(this.routeGroup);

    this.map.fitBounds(this.routeGroup.getBounds(), { padding: [40, 40], maxZoom: 16 });
  }

  protected pictureSrc(): string | null {
    const url = this.details()?.route.pictureUrl;
    return url ? `${API_BASE_URL}${url}` : null;
  }

  protected distanceText(): string {
    return formatDistance(this.details()?.route.distanceMeters ?? 0);
  }

  protected timeText(): string {
    return formatDuration((this.details()?.route.estimatedTimeInMinutes ?? 0) * 60);
  }

protected reportRoute(): void {
    if (this.isReporting()) return;

    if (!this.authService.isLoggedIn()) {
      this.gpxService.showNotification({
        type: 'error',
        message: 'Please log in to report a route.',
      });
      this.authService.requestLogin();
      return;
    }

    if (!window.confirm('Report this route as inappropriate or incorrect?')) return;

    this.isReporting.set(true);
    this.publishingService.reportRoute(this.routeId).subscribe({
      next: () => {
        this.isReporting.set(false);
        this.gpxService.showNotification({
          type: 'success',
          message: 'Thank you. The route was reported and is no longer visible to others.',
        });
        this.router.navigate(['/explore']);
      },
      error: (err: unknown) => {
        this.isReporting.set(false);
        let message = 'Could not report the route. Try again later.';
        if (err instanceof HttpErrorResponse) {
          if (err.status === 403) message = 'You cannot report your own route.';
          else if (err.status === 409) message = 'You have already reported this route.';
          else if (err.status === 404) message = 'This route is not available anymore.';
          else if (err.status === 401) return; // the interceptor opens the login popup
        }
        this.gpxService.showNotification({ type: 'error', message });
      },
    });
  }
}