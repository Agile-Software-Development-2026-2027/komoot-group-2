import { Injectable, signal } from '@angular/core';

/** Shared state of the "Add Waypoint" flow: the menu starts it, the map carries it out. */
@Injectable({
  providedIn: 'root',
})
export class WaypointPlacementService {
  /** True while the waypoint marker follows the mouse, waiting for the click that places it. */
  readonly isPlacing = signal(false);

  start(): void {
    this.isPlacing.set(true);
  }

  stop(): void {
    this.isPlacing.set(false);
  }
}
