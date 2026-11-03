import { Component, HostListener, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MenuBar } from './menu-bar/menu-bar';
import { ItalyMap } from './italy-map/italy-map';
import { GpxService } from './services/gpx.service';

@Component({
  selector: 'app-root',
  imports: [ItalyMap, MenuBar, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public readonly gpxService = inject(GpxService);
  public readonly isDragging = signal(false);

  private dragCounter = 0;

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
