import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * Maneja errores HTTP globalmente.
 * 401 → intenta renovar el token automáticamente.
 * 403 → redirige a /app/dashboard con mensaje.
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        // Intentar renovar el token automáticamente
        return authService.refreshToken().pipe(
          switchMap(response => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.data.accessToken}`
              }
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 403) {
        router.navigate(['/app/dashboard']);
      }

      return throwError(() => error);
    })
  );
};