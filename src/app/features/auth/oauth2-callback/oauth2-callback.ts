import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Este componente se activa después de que el backend redirige
 * al frontend con los tokens en los query params.
 *
 * El backend Spring hace el handshake con Google y luego redirige a:
 * http://localhost:4200/oauth2/callback?token=ACCESS&refresh=REFRESH&profileCompleted=true
 */

@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './oauth2-callback.html',
  styleUrl: './oauth2-callback.scss',
})
export class Oauth2Callback implements OnInit {

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private authSvc = inject(AuthService);

  error = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token        = params['token'];
      const refreshToken = params['refresh'];
      const profileDone  = params['profileCompleted'] === 'true';

      if (!token) {
        this.error.set('No se recibió el token de autenticación.');
        return;
      }

      localStorage.setItem('profileCompleted', String(profileDone));

      // Guardar tokens y traer el usuario para sincronizar las señales
      this.authSvc.handleOAuthCallback(token, refreshToken).subscribe({
        next: () => {
          if (!profileDone) {
            this.router.navigate(['/complete-profile']);
          } else {
            this.router.navigate(['/app/dashboard']);
          }
        },
        error: () => {
          this.error.set('No se pudo completar el inicio de sesión. Intenta de nuevo.');
        },
      });
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
