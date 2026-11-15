import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AUTH_ENDPOINTS, isBackendUrl } from '../config/api.config';
import { AuthService } from '../services/auth.service';

/**
 * Attaches `Authorization: Bearer <jwt>` to requests sent to our backend when the user is
 * logged in. Requests to third-party APIs (OSRM, Open-Meteo, ...) never receive the token.
 *
 * Anonymous users can still call the public endpoints; when a `@LoginRequired` endpoint
 * answers 401 (missing, invalid or expired token) the user is logged out and asked to log in.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBackendUrl(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getValidToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const isAuthCall = req.url === AUTH_ENDPOINTS.login || req.url === AUTH_ENDPOINTS.register;
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthCall) {
        auth.logout();
        auth.requestLogin();
      }
      return throwError(() => error);
    }),
  );
};
