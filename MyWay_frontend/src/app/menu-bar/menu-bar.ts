import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { GpxExportService } from '../services/gpx-export.service';
import { GpxService } from '../services/gpx.service';
import { TrackStyleHandler } from '../services/track-style-handler.service';
@Component({
  selector: 'app-menu-bar',
  imports: [],
  templateUrl: './menu-bar.html',
  styleUrl: './menu-bar.css',
})
export class MenuBar {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  private readonly gpxService = inject(GpxService);
  private readonly gpxExportService = inject(GpxExportService);
  private readonly elementRef = inject(ElementRef);
  private readonly trackStyleHandler= inject(TrackStyleHandler);

  public isFileMenuOpen = false;
  public isEditMenuOpen = false;
  public isTrackDesignOpen = false;
  public isLoginOpen = false;
  readonly hasRoute = this.gpxExportService.hasRoute;

  public color = this.trackStyleHandler.getCurrentStyle().color;
  public weight = this.trackStyleHandler.getCurrentStyle().weight;

  /** Toggle the File dropdown menu */
  public toggleFileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isLoginOpen = false;
    this.isEditMenuOpen = false;
    this.isFileMenuOpen = !this.isFileMenuOpen;
  }

  /** Close the File dropdown menu */
  public closeFileMenu(): void {
    this.isFileMenuOpen = false;
  }
  // Toggle the Edit dropdown menu
  public toggleEditMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isLoginOpen = false;
    this.isFileMenuOpen = false;
    this.isTrackDesignOpen = false;
    this.isEditMenuOpen = !this.isEditMenuOpen;
  }
  //Close the Edit dropdown menu
  public closeEditMenu(): void {
    this.isEditMenuOpen = false;
    this.isTrackDesignOpen = false;
  }
  //Opne-close the Track submenu
  public toggleTrackDesign(): void {
    this.isTrackDesignOpen = !this.isTrackDesignOpen;
  }

  /** Toggle the user login popup */
  public toggleLoginPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.isFileMenuOpen = false;
    this.isEditMenuOpen = false;
    this.isTrackDesignOpen = false;
    this.isLoginOpen = !this.isLoginOpen;
  }

  /** Close the user login popup */
  public closeLoginPopup(): void {
    this.isLoginOpen = false;
  }

  /** Open the file picker to add a GPX file and close the menu */
  public onAddClick(): void {
    this.closeFileMenu();
    this.fileInput?.nativeElement.click();
  }

  /** Handle the GPX file chosen by the user */
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

  /** Export the current route as a GPX file and close the menu */
  public onExportClick(): void {
    this.closeFileMenu();
    this.gpxExportService.downloadGpx();
  }
  // Save the color chosen by the user
  public onColorChange(event:Event): void{
    this.color=(event.target as HTMLInputElement).value;
    this.trackStyleHandler.setColor(this.color);
  }
  //Save the thickness chosen by the user
  public onWeightChange(event:Event) : void{
    this.weight= Number((event.target as HTMLInputElement).value);
    this.trackStyleHandler.setWeight(this.weight);
  }

  /** Close menus and popups when clicking outside the component */
  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeFileMenu();
      this.closeEditMenu();
      this.closeLoginPopup();
    }
  }

  /** Close menus and popups when pressing Escape */
  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.closeFileMenu();
    this.closeEditMenu();
    this.closeLoginPopup();
  }
}
