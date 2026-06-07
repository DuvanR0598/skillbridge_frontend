import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { rolGuard } from './core/auth/rol.guard';
import { perfilGuard } from './core/auth/perfil.guard';

export const routes: Routes = [
  // ── Layout sin sidebar (auth) ──────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.RegisterComponent),
      },
      {
        path: 'complete-profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auth/completar-perfil/completar-perfil').then(
            (m) => m.CompletarPerfil,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ── Layout principal con sidebar ───────────────────────────────
  {
    path: 'app',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard, perfilGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'assessment',
        canActivate: [rolGuard],
        data: { roles: ['ROLE_ESTUDIANTE'] },
        loadChildren: () =>
          import('./features/assessment/assessment.routes').then(
            (m) => m.assessmentRoutes,
          ),
      },
      {
        path: 'analytics',
        loadChildren: () =>
          import('./features/analytics/analytics.routes').then((m) => m.analyticsRoutes),
      },
      {
        path: 'admin/users',
        canActivate: [rolGuard],
        data: { roles: ['ROLE_ADMIN'] },
        loadComponent: () =>
          import('./features/admin/users/admin-users').then((m) => m.AdminUsers),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
   },

  // ── OAuth2 callback de Google ──────────────────────────────────
  {
    path: 'oauth2/callback',
    loadComponent: () =>
      import('./features/auth/oauth2-callback/oauth2-callback').then(
        (m) => m.Oauth2Callback,
      ),
  },

  // ── 404 ───────────────────────────────────────────────────────
  // {
  //   path: '**',
  //   loadComponent: () =>
  //     import('./shared/components/not-found/not-found').then((m) => m.NotFound),
  // },
];
