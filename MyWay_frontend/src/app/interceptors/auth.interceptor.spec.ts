import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL, AUTH_ENDPOINTS } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fakeJwt(expSeconds: number): string {
  return `${base64Url({ alg: 'HS256' })}.${base64Url({ sub: 'mario@example.com', exp: expSeconds })}.sig`;
}

const BACKEND_URL = `${API_BASE_URL}/api/routes`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  function logIn(): string {
    const token = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    auth.login({ email: 'mario@example.com', password: 'Secret1' }).subscribe();
    httpMock.expectOne(AUTH_ENDPOINTS.login).flush({ token });
    return token;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('sends backend requests without Authorization when logged out', () => {
    http.get(BACKEND_URL).subscribe();
    expect(httpMock.expectOne(BACKEND_URL).request.headers.has('Authorization')).toBe(false);
  });

  it('adds the Bearer token to backend requests when logged in', () => {
    const token = logIn();
    http.get(BACKEND_URL).subscribe();
    expect(httpMock.expectOne(BACKEND_URL).request.headers.get('Authorization')).toBe(
      `Bearer ${token}`,
    );
  });

  it('never sends the token to third-party APIs', () => {
    logIn();
    const external = [
      'https://api.open-meteo.com/v1/elevation',
      'https://routing.openstreetmap.de/routed-foot/route/v1/foot/1,2;3,4',
      `${API_BASE_URL}0/look-alike-host`,
    ];
    for (const url of external) {
      http.get(url).subscribe();
      expect(httpMock.expectOne(url).request.headers.has('Authorization')).toBe(false);
    }
  });

  it('logs out and asks for login when a protected call returns 401', () => {
    logIn();
    http.get(BACKEND_URL).subscribe({ error: () => undefined });
    httpMock.expectOne(BACKEND_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.loginRequested()).toBe(1);
  });

  it('does not ask for login again when the login call itself returns 401', () => {
    auth.login({ email: 'mario@example.com', password: 'wrong' }).subscribe({
      error: () => undefined,
    });
    httpMock.expectOne(AUTH_ENDPOINTS.login).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.loginRequested()).toBe(0);
  });

  it('keeps the session on other errors', () => {
    logIn();
    http.get(BACKEND_URL).subscribe({ error: () => undefined });
    httpMock.expectOne(BACKEND_URL).flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.isLoggedIn()).toBe(true);
  });
});
