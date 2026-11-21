import { Component, HostListener, ViewChild, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MenuBar } from './menu-bar/menu-bar';
import { ItalyMap } from './italy-map/italy-map';
import { Sidebar } from './sidebar/sidebar';
import { GpxService } from './services/gpx.service';

@Component({
  selector: 'app-root',
  imports: [ItalyMap, MenuBar, Sidebar, AsyncPipe, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild(ItalyMap) private italyMap?: ItalyMap;

  public readonly gpxService = inject(GpxService);
  private readonly router = inject(Router);

  public readonly isDragging = signal(false);
  /** True while the map page ('/') is shown */
  public readonly isMapPage = signal(this.router.url === '/' || this.router.url === '');

  private dragCounter = 0;

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const onMap = (e as NavigationEnd).urlAfterRedirects === '/';
      this.isMapPage.set(onMap);
      // Leaflet must recalculate its size after being hidden
      if (onMap) {
        setTimeout(() => this.italyMap?.refreshSize());
      }
    });
  }

  @HostListener('window:dragenter', ['$event'])
  public onWindowDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    if (event.dataTransfer?.types?.includes('Files')) {
      this.isDragging.set(true);
    }
  }

  @HostListener('window:dragover', ['$event'])
  public onWindowDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  @HostListener('window:dragleave', ['$event'])
  public onWindowDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragging.set(false);
    }
  }

  @HostListener('window:drop', ['$event'])
  public onWindowDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = 0;
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.gpxService.loadGpxFile(files[0]).catch(() => {
        // Notification is handled inside GpxService
      });
    }
  }

  public dismissNotification(): void {
    this.gpxService.clearNotification();
  }
}