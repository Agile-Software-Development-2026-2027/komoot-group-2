import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AUTH_ENDPOINTS } from '../config/api.config';

/** Body returned by the backend login/register endpoints. */
export interface AuthResponse {
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

/** Claims of the JWT issued by the backend (JWTService.generateToken). */
interface JwtPayload {
  /** The user's email. */
  sub?: string;
  /** Issued at, seconds since epoch. */
  iat?: number;
  /** Expiration, seconds since epoch. */
  exp?: number;
}

const TOKEN_STORAGE_KEY = 'myway.jwt';

/**
 * Keeps the JWT issued by the backend.
 *
 * The token is stored in localStorage so the session survives a page reload, and it is
 * dropped automatically when it expires. The token is attached to backend requests by
 * `authInterceptor`; endpoints without `@LoginRequired` still work for anonymous users.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(null);
  private readonly loginRequestedSignal = signal(0);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  /** Current valid token, or null when logged out. */
  readonly token = this.tokenSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.tokenSignal() !== null);
  /** Email of the logged-in user (the token subject). */
  readonly userEmail = computed(() => {
    const token = this.tokenSignal();
    return token ? (AuthService.decodePayload(token)?.sub ?? null) : null;
  });
  /**
   * Incremented every time the user must log in (e.g. the backend answered 401).
   * The menu bar watches it to open the login popup.
   */
  readonly loginRequested = this.loginRequestedSignal.asReadonly();

  constructor() {
    const stored = this.readStoredToken();
    if (stored) {
      this.setToken(stored);
    }
  }

  login(request: LoginRequest): Observable<void> {
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.login, request).pipe(
      tap((res) => this.handleAuthResponse(res)),
      map(() => undefined),
    );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.register, request).pipe(
      tap((res) => this.handleAuthResponse(res)),
      map(() => undefined),
    );
  }

  logout(): void {
    this.clearExpiryTimer();
    this.tokenSignal.set(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode, ...): nothing to clean up
    }
  }

  /** Ask the UI to show the login popup (used when a protected call is rejected). */
  requestLogin(): void {
    this.loginRequestedSignal.update((n) => n + 1);
  }

  /** Returns the token only if it is still valid, logging out when it has expired. */
  getValidToken(): string | null {
    const token = this.tokenSignal();
    if (token && AuthService.isExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  }

  private handleAuthResponse(res: AuthResponse | null): void {
    if (!res?.token || !this.setToken(res.token)) {
      throw new Error('The server did not return a valid token');
    }
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
    } catch {
      // Storage unavailable: the session will just not survive a reload
    }
  }

  /** Stores the token in memory and schedules the automatic logout. Returns false if unusable. */
  private setToken(token: string): boolean {
    const payload = AuthService.decodePayload(token);
    if (!payload || AuthService.isExpired(token)) {
      this.logout();
      return false;
    }
    this.tokenSignal.set(token);
    this.scheduleExpiry(payload.exp);
    return true;
  }

  private scheduleExpiry(exp: number | undefined): void {
    this.clearExpiryTimer();
    if (exp === undefined) {
      return;
    }
    // setTimeout overflows above ~24.8 days; tokens last 24h, cap anyway for safety.
    const delay = Math.min(exp * 1000 - Date.now(), 2_147_483_647);
    this.expiryTimer = setTimeout(() => this.logout(), Math.max(delay, 0));
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** Decodes (without verifying: only the backend can do that) the payload of a JWT. */
  static decodePayload(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = new TextDecoder().decode(
        Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
      );
      const payload: unknown = JSON.parse(json);
      return payload && typeof payload === 'object' ? (payload as JwtPayload) : null;
    } catch {
      return null;
    }
  }

  static isExpired(token: string, now: number = Date.now()): boolean {
    const exp = AuthService.decodePayload(token)?.exp;
    return exp !== undefined && exp * 1000 <= now;
  }
}
