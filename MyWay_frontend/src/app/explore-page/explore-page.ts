import { Component, inject, signal } from '@angular/core';
import { API_BASE_URL } from '../config/api.config';
import { PublishedRoute, RoutePublishingService } from '../services/route-publishing.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-explore-page',
  imports: [RouterLink],
  templateUrl: './explore-page.html',
  styleUrl: './explore-page.css',
})
export class ExplorePage {
  private readonly publishingService = inject(RoutePublishingService);

  protected readonly routes = signal<PublishedRoute[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.publishingService.getPublicRoutes().subscribe({
      next: (list) => {
        this.routes.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the routes. Try again later.');
        this.loading.set(false);
      },
    });
  }

  /** The backend returns a relative picture URL */
  protected pictureSrc(route: PublishedRoute): string | null {
    return route.pictureUrl ? `${API_BASE_URL}${route.pictureUrl}` : null;
  }

  protected formatDistance(meters: number | null): string {
    if (meters === null) return '—';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  }

  protected formatTime(minutes: number | null): string {
    if (minutes === null) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }
}