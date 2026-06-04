import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protege rutas según el rol del usuario.
 * Uso en routes: data: { roles: ['ROLE_ADMIN', 'ROLE_COORDINADOR'] }
 */
export const rolGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService  = inject(AuthService);
  const router       = inject(Router);
  const allowedRoles = route.data['roles'] as string[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) return true;

  if (authService.hasAnyRole(...allowedRoles)) return true;

  // Sin permiso → redirigir al dashboard
  router.navigate(['/app/dashboard']);
  return false;
};