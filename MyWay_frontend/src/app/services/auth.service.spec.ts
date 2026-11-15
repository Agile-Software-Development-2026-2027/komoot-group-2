import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ENDPOINTS } from '../config/api.config';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'myway.jwt';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Builds an unsigned JWT-shaped token (the frontend never verifies the signature). */
function fakeJwt(expSeconds: number, sub = 'mario@example.com'): string {
  return `${base64Url({ alg: 'HS256' })}.${base64Url({ sub, iat: 1, exp: expSeconds })}.signature`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    httpMock?.verify();
    vi.useRealTimers();
  });

  it('starts logged out when no token is stored', () => {
    setup();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.userEmail()).toBeNull();
  });

  it('logs in, stores the token and exposes the email', () => {
    setup();
    const token = fakeJwt(inOneHour());

    service.login({ email: 'mario@example.com', password: 'Secret1' }).subscribe();
    const req = httpMock.expectOne(AUTH_ENDPOINTS.login);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'mario@example.com', password: 'Secret1' });
    req.flush({ token });

    expect(service.isLoggedIn()).toBe(true);
    expect(service.userEmail()).toBe('mario@example.com');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(token);
  });

  it('registers and logs in with the returned token', () => {
    setup();
    service
      .register({ email: 'mario@example.com', username: 'mario', password: 'Secret1' })
      .subscribe();
    const req = httpMock.expectOne(AUTH_ENDPOINTS.register);
    expect(req.request.body).toEqual({
      email: 'mario@example.com',
      username: 'mario',
      password: 'Secret1',
    });
    req.flush({ token: fakeJwt(inOneHour()) });

    expect(service.isLoggedIn()).toBe(true);
  });

  it('rejects an already expired token returned by the server', () => {
    setup();
    const onError = vi.fn();
    service.login({ email: 'a', password: 'b' }).subscribe({ error: onError });
    httpMock.expectOne(AUTH_ENDPOINTS.login).flush({ token: fakeJwt(1) });

    expect(onError).toHaveBeenCalled();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('errors when the response has no token', () => {
    setup();
    const onError = vi.fn();
    service.login({ email: 'a', password: 'b' }).subscribe({ error: onError });
    httpMock.expectOne(AUTH_ENDPOINTS.login).flush({});

    expect(onError).toHaveBeenCalled();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('restores a valid token from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, fakeJwt(inOneHour()));
    setup();
    expect(service.isLoggedIn()).toBe(true);
  });

  it('discards an expired or malformed token found in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-jwt');
    setup();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('logout clears memory and storage', () => {
    localStorage.setItem(STORAGE_KEY, fakeJwt(inOneHour()));
    setup();

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('logs out automatically when the token expires', () => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, fakeJwt(Math.floor(Date.now() / 1000) + 60));
    setup();
    expect(service.isLoggedIn()).toBe(true);

    vi.advanceTimersByTime(61_000);

    expect(service.isLoggedIn()).toBe(false);
  });

  it('requestLogin increments the loginRequested counter', () => {
    setup();
    expect(service.loginRequested()).toBe(0);
    service.requestLogin();
    expect(service.loginRequested()).toBe(1);
  });
});
