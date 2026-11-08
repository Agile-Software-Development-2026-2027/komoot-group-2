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
  public isSignInOpen = false;
  public registerPassword = '';
  readonly hasRoute = this.gpxExportService.hasRoute;

  public color = this.trackStyleHandler.getCurrentStyle().color;
  public weight = this.trackStyleHandler.getCurrentStyle().weight;

  /** Toggle the File dropdown menu */
  public toggleFileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.closeLoginPopup();
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
    this.closeLoginPopup();
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
    if (this.isLoginOpen || this.isSignInOpen) {
      this.closeLoginPopup();
    } else {
      this.isLoginOpen = true;
      this.isSignInOpen = false;
    }
  }

  /** Close the user login and sign-in popups */
  public closeLoginPopup(): void {
    this.isLoginOpen = false;
    this.isSignInOpen = false;
    this.registerPassword = '';
  }

  /** Switch to sign-in popup */
  public openSignIn(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isLoginOpen = false;
    this.isSignInOpen = true;
  }

  /** Switch to login popup */
  public openLogin(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isSignInOpen = false;
    this.isLoginOpen = true;
  }

  public onPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.registerPassword = input.value;
  }

  public get hasMinLength(): boolean {
    return this.registerPassword.length >= 6;
  }

  public get hasUppercase(): boolean {
    return /[A-Z]/.test(this.registerPassword);
  }

  public get hasLowercase(): boolean {
    return /[a-z]/.test(this.registerPassword);
  }

  public get hasNumber(): boolean {
    return /\d/.test(this.registerPassword);
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
