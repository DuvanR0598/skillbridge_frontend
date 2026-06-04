import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegistrarRequest, UserResponse } from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;

  // ── Estado reactivo con Signals (Angular 17+) ──────────────────
  private _currentUser = signal<UserResponse | null>(this.loadUserFromStorage());
  private _accessToken = signal<string | null>(localStorage.getItem('accessToken'));

  // Signals públicos de solo lectura
  readonly currentUser = this._currentUser.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isLoggedIn = computed(() => !!this._accessToken());
  readonly userRoles = computed(() => this._currentUser()?.roles ?? []);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ── Registro ───────────────────────────────────────────────────

  register(request: RegistrarRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.API}/auth/register`, request)
      .pipe(tap((response) => this.handleAuthSuccess(response.data)));
  }

  // ── Login ──────────────────────────────────────────────────────

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.API}/auth/login`, request)
      .pipe(tap((response) => this.handleAuthSuccess(response.data)));
  }

  // ── Refresh token ──────────────────────────────────────────────

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.API}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => this.handleAuthSuccess(response.data)),
        catchError((error) => {
          // Si el refresh falla, desloguear
          this.logout();
          return throwError(() => error);
        }),
      );
  }

  // ── Logout ─────────────────────────────────────────────────────

  logout(): void {
    // Llamar al backend para revocar el refresh token
    const accessToken = this._accessToken();
    if (accessToken) {
      this.http.post(`${this.API}/auth/logout`, {}).subscribe();
    }

    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ── Login con Google ───────────────────────────────────────────

  loginWithGoogle(): void {
    // Redirige al endpoint de Google OAuth2 del backend
    window.location.href = `${environment.apiUrl.replace('/api/v1', '')}/oauth2/authorization/google`;
  }

  /**
   * Completa el login tras el redirect de OAuth2 (Google).
   * Guarda los tokens y trae el usuario desde /usuarios/me para
   * dejar las señales (currentUser, isLoggedIn) sincronizadas.
   */
  handleOAuthCallback(
    accessToken: string,
    refreshToken: string,
  ): Observable<UserResponse> {
    // Persistir y reflejar el token antes de pedir /usuarios/me
    // (el authInterceptor lo necesita para autenticar la petición)
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this._accessToken.set(accessToken);

    return this.http
      .get<ApiResponse<UserResponse>>(`${this.API}/usuarios/me`)
      .pipe(
        map((response) => response.data),
        tap((user) => {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this._currentUser.set(user);
        }),
        catchError((error) => {
          // Token inválido o error de red: limpiar sesión a medias
          this.clearSession();
          return throwError(() => error);
        }),
      );
  }

  // ── Helpers de autorización ────────────────────────────────────

  hasRole(role: string): boolean {
    return this.userRoles().includes(role);
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  isTeacher(): boolean {
    return this.hasRole('ROLE_COORDINADOR');
  }

  isStudent(): boolean {
    return this.hasRole('ROLE_ESTUDIANTE');
  }

  // ── Helpers privados ───────────────────────────────────────────

  private handleAuthSuccess(data: AuthResponse): void {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(data.user));

    this._accessToken.set(data.accessToken);
    this._currentUser.set(data.user);

    // Redirigir según si el perfil está completo
    if (!data.profileCompleted) {
      this.router.navigate(['/complete-profile']);
    } else {
      this.router.navigate(['/app/dashboard']);
    }
  }

  private clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this._accessToken.set(null);
    this._currentUser.set(null);
  }

  private loadUserFromStorage(): UserResponse | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }
}
