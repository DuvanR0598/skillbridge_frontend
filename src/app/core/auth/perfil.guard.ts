import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Si el perfil no está completo → redirige a /complete-profile.
 * Permite que el usuario complete su perfil antes de usar la app.
 */
export const perfilGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const user        = authService.currentUser();

  // Sin usuario → el authGuard ya lo manejó
  if (!user) return true;

  // Verificar en localStorage si el perfil está completo
  // (el backend lo retorna en el AuthResponse)
  const profileCompleted = localStorage.getItem('profileCompleted') === 'true';

  if (!profileCompleted) {
    router.navigate(['/complete-profile']);
    return false;
  }

  return true;
};