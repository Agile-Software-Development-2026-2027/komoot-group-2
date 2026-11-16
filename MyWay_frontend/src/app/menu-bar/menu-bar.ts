import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, ViewChild, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { GpxExportService } from '../services/gpx-export.service';
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
  private readonly gpxExportService = inject(GpxExportService);
  private readonly elementRef = inject(ElementRef);
  private readonly authService = inject(AuthService);

  public isFileMenuOpen = false;
  // Signals: these change from HTTP callbacks and effects too, not only from DOM events
  public readonly isLoginOpen = signal(false);
  public readonly isSignInOpen = signal(false);
  public readonly isAccountOpen = signal(false);
  public readonly authError = signal<string | null>(null);
  public readonly isSubmitting = signal(false);
  public registerPassword = '';
  readonly hasRoute = this.gpxExportService.hasRoute;
  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly userEmail = this.authService.userEmail;

  constructor() {
    // A protected backend call was rejected (401): ask the user to log in again.
    effect(() => {
      if (this.authService.loginRequested() > 0) {
        untracked(() => this.openLogin());
      }
    });
  }

  /** True when any of the user popups (login, sign up, account) is open */
  public isUserPopupOpen(): boolean {
    return this.isLoginOpen() || this.isSignInOpen() || this.isAccountOpen();
  }

  /** Toggle the File dropdown menu */
  public toggleFileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.closeLoginPopup();
    this.isFileMenuOpen = !this.isFileMenuOpen;
  }

  /** Close the File dropdown menu */
  public closeFileMenu(): void {
    this.isFileMenuOpen = false;
  }

  /** Toggle the user login popup */
  public toggleLoginPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.isFileMenuOpen = false;
    if (this.isUserPopupOpen()) {
      this.closeLoginPopup();
    } else if (this.isLoggedIn()) {
      this.isAccountOpen.set(true);
    } else {
      this.openLogin();
    }
  }

  /** Close the user login, sign-in and account popups */
  public closeLoginPopup(): void {
    this.isLoginOpen.set(false);
    this.isSignInOpen.set(false);
    this.isAccountOpen.set(false);
    this.authError.set(null);
    this.registerPassword = '';
  }

  /** Switch to sign-in popup */
  public openSignIn(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isLoginOpen.set(false);
    this.isAccountOpen.set(false);
    this.authError.set(null);
    this.isSignInOpen.set(true);
  }

  /** Switch to login popup */
  public openLogin(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isSignInOpen.set(false);
    this.isAccountOpen.set(false);
    this.authError.set(null);
    this.isLoginOpen.set(true);
  }

  /** Submit the login form */
  public onLoginSubmit(event: Event, email: string, password: string): void {
    event.preventDefault();
    if (!email.trim() || !password) {
      this.authError.set('Enter email and password.');
      return;
    }
    this.submitAuth(this.authService.login({ email: email.trim(), password }), {
      401: 'Wrong email or password.',
      403: 'Wrong email or password.',
    });
  }

  /** Submit the registration form */
  public onRegisterSubmit(event: Event, email: string, username: string, password: string): void {
    event.preventDefault();
    if (!email.trim() || !username.trim()) {
      this.authError.set('Enter email and username.');
      return;
    }
    if (!this.isPasswordValid) {
      this.authError.set('The password does not meet all the criteria.');
      return;
    }
    this.submitAuth(
      this.authService.register({ email: email.trim(), username: username.trim(), password }),
      {
        400: 'Invalid data: check email, username and password.',
        409: 'An account with this email already exists.',
      },
    );
  }

  /** Log out the current user */
  public onLogout(): void {
    this.authService.logout();
    this.closeLoginPopup();
  }

  private submitAuth(
    request: ReturnType<AuthService['login']>,
    messages: Partial<Record<number, string>>,
  ): void {
    if (this.isSubmitting()) {
      return;
    }
    this.isSubmitting.set(true);
    this.authError.set(null);
    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeLoginPopup();
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        if (err instanceof HttpErrorResponse) {
          this.authError.set(
            messages[err.status] ??
              (err.status === 0 ? 'Server unreachable, try again later.' : 'Something went wrong, try again.'),
          );
        } else {
          this.authError.set('Something went wrong, try again.');
        }
      },
    });
  }

  public onPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.registerPassword = input.value;
  }

  public get hasMinLength(): boolean {
    return this.registerPassword.length >= 8;
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

  public get isPasswordValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasNumber;
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

  /** Close menus and popups when clicking outside the component */
  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeFileMenu();
      this.closeLoginPopup();
    }
  }

  /** Close menus and popups when pressing Escape */
  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.closeFileMenu();
    this.closeLoginPopup();
  }
}
