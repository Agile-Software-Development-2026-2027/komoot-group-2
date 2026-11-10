import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MenuBar } from './menu-bar';
import { GpxExportService } from '../services/gpx-export.service';
import { AuthService } from '../services/auth.service';
import { AUTH_ENDPOINTS } from '../config/api.config';

/** The File menu has more items ("Add", "Export GPX", ...): find one by its label. */
function findMenuItem(host: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('.dropdown-item')).find((item) =>
    item.textContent?.includes(label),
  );
}

describe('MenuBar', () => {
  let component: MenuBar;
  let fixture: ComponentFixture<MenuBar>;
  let gpxExportService: GpxExportService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuBar],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuBar);
    component = fixture.componentInstance;
    gpxExportService = TestBed.inject(GpxExportService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open the File dropdown menu when File button is clicked', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.dropdown-menu')).toBeNull();

    const fileBtn = host.querySelector<HTMLButtonElement>('.menu-dropdown-container .menu-btn')!;
    fileBtn.click();
    fixture.detectChanges();

    const dropdown = host.querySelector('.dropdown-menu');
    expect(dropdown).toBeTruthy();

    expect(findMenuItem(host, 'Add')).toBeTruthy();
    expect(findMenuItem(host, 'Export GPX')).toBeTruthy();
  });

  it('should trigger GPX download and close the menu when Export GPX item is clicked', () => {
    const downloadSpy = vi.spyOn(gpxExportService, 'downloadGpx').mockReturnValue('<gpx></gpx>');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const fileBtn = host.querySelector<HTMLButtonElement>('.menu-dropdown-container .menu-btn')!;
    fileBtn.click();
    fixture.detectChanges();

    const exportItem = findMenuItem(host, 'Export GPX')!;
    exportItem.click();
    fixture.detectChanges();

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(component.isFileMenuOpen).toBe(false);
    expect(host.querySelector('.dropdown-menu')).toBeNull();
  });

  describe('authentication', () => {
    let httpMock: HttpTestingController;
    let authService: AuthService;
    let host: HTMLElement;

    const fakeJwt = () => {
      const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
      const exp = Math.floor(Date.now() / 1000) + 3600;
      return `${b64({ alg: 'HS256' })}.${b64({ sub: 'mario@example.com', exp })}.sig`;
    };
    const type = (selector: string, value: string) => {
      const input = host.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const click = (selector: string) => host.querySelector<HTMLElement>(selector)!.click();

    beforeEach(() => {
      localStorage.clear();
      httpMock = TestBed.inject(HttpTestingController);
      authService = TestBed.inject(AuthService);
      host = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
    });

    afterEach(() => {
      httpMock.verify();
      authService.logout();
    });

    it('logs in from the popup and then shows the account popup', async () => {
      click('.user-btn');
      fixture.detectChanges();
      type('#login-email', 'mario@example.com');
      type('#login-password', 'Secret1');
      click('.login-submit-btn');
      fixture.detectChanges();

      const req = httpMock.expectOne(AUTH_ENDPOINTS.login);
      expect(req.request.body).toEqual({ email: 'mario@example.com', password: 'Secret1' });
      req.flush({ token: fakeJwt() });
      await fixture.whenStable();

      expect(host.querySelector('.login-popup')).toBeNull();
      expect(host.querySelector('.user-btn.logged-in')).toBeTruthy();

      click('.user-btn');
      fixture.detectChanges();
      expect(host.querySelector('.account-email')?.textContent).toContain('mario@example.com');

      click('.login-submit-btn'); // "Log out"
      fixture.detectChanges();
      expect(authService.isLoggedIn()).toBe(false);
      expect(host.querySelector('.user-btn.logged-in')).toBeNull();
    });

    it('shows an error when the credentials are wrong', async () => {
      click('.user-btn');
      fixture.detectChanges();
      type('#login-email', 'mario@example.com');
      type('#login-password', 'wrong');
      click('.login-submit-btn');

      httpMock
        .expectOne(AUTH_ENDPOINTS.login)
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      await fixture.whenStable();

      expect(host.querySelector('.auth-error')?.textContent).toContain('Wrong email or password');
      expect(authService.isLoggedIn()).toBe(false);
    });

    it('does not send the registration when the password is too weak', async () => {
      click('.user-btn');
      fixture.detectChanges();
      click('.forgot-password:nth-of-type(2)'); // "Sign up"
      fixture.detectChanges();
      type('#signin-email', 'mario@example.com');
      type('#signin-username', 'mario');
      type('#signin-password', 'weak');
      click('.login-submit-btn');
      await fixture.whenStable();

      httpMock.expectNone(AUTH_ENDPOINTS.register);
      expect(host.querySelector('.auth-error')?.textContent).toContain('criteria');
    });

    it('opens the login popup when a protected call is rejected', async () => {
      authService.requestLogin();
      await fixture.whenStable();

      expect(host.querySelector('#login-title')).toBeTruthy();
    });
  });
});
