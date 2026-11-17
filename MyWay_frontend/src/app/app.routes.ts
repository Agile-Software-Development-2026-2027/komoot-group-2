import { Routes } from '@angular/router';
import { ExplorePage } from './explore-page/explore-page';
import { RouteDetailsPage } from './route-details-page/route-details-page';

/**
 * The map is not a route: it stays alive in app.html (hidden on other pages) so the routes
 * drawn on it are not lost. The path '' therefore has no component.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: 'explore', component: ExplorePage },
  { path: 'explore/:id', component: RouteDetailsPage },
  { path: '**', redirectTo: '' },
];