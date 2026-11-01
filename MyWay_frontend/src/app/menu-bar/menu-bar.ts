import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { GpxExportService } from '../services/gpx-export.service';

@Component({
  selector: 'app-menu-bar',
  imports: [],
  templateUrl: './menu-bar.html',
  styleUrl: './menu-bar.css',
})
export class MenuBar {
  private readonly gpxExportService = inject(GpxExportService);
  private readonly elementRef = inject(ElementRef);

  public isFileMenuOpen = false;
  readonly hasRoute = this.gpxExportService.hasRoute;

  public toggleFileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isFileMenuOpen = !this.isFileMenuOpen;
  }

  public closeFileMenu(): void {
    this.isFileMenuOpen = false;
  }

  public onExportClick(): void {
    this.closeFileMenu();
    this.gpxExportService.downloadGpx();
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeFileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.closeFileMenu();
  }
}
