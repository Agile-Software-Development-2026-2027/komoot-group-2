import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { GpxService } from '../services/gpx.service';

@Component({
  selector: 'app-menu-bar',
  imports: [],
  templateUrl: './menu-bar.html',
  styleUrl: './menu-bar.css',
})
export class MenuBar {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  private readonly gpxService = inject(GpxService);
  private readonly elementRef = inject(ElementRef);

  public isFileMenuOpen = false;

  public toggleFileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isFileMenuOpen = !this.isFileMenuOpen;
  }

  public closeFileMenu(): void {
    this.isFileMenuOpen = false;
  }

  public onAddClick(): void {
    this.closeFileMenu();
    this.fileInput?.nativeElement.click();
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.gpxService.loadGpxFile(file).catch(() => {
        // Notification is handled inside GpxService
      });
      // Reset value so re-uploading the same file triggers change
      input.value = '';
    }
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
