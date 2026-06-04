# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200
npm run build      # Production build
npm test           # Run unit tests (vitest via @angular/build:unit-test)
ng test --include="src/app/features/auth/**/*.spec.ts"  # Run tests for a specific feature
```

There is no separate lint script configured; TypeScript strict mode (`tsconfig.json`) and Angular template strict checks catch most issues at compile time.

## Architecture

**SkillBridge** is an Angular 21 SPA for engineering skills assessment. It connects to a Spring Boot backend at `http://localhost:8083` (configured in `src/environments/environment.ts`).

### Two-layout pattern

The router (`app.routes.ts`) splits into two shells:
- **`AuthLayout`** (`/`) — unauthenticated pages (login, register, complete-profile)
- **`MainLayout`** (`/app/*`) — authenticated pages with sidebar (dashboard, questionnaires, assessment, analytics, profile) — currently commented out, pending implementation

### Auth flow

`AuthService` holds reactive state (signals) and persists JWT tokens in `localStorage`:
- `accessToken` / `refreshToken` / `currentUser` keys
- After login/register: redirects to `/complete-profile` if profile is incomplete, otherwise `/app/dashboard`
- `errorInterceptor` automatically retries failed requests after a 401 by calling `/auth/refresh`; logs out on second failure

### Guards (three-layer)

1. `authGuard` — token presence check; redirects to `/login`
2. `perfilGuard` — checks `localStorage.profileCompleted`; redirects to `/complete-profile`
3. `rolGuard` — reads `route.data.roles`; redirects to `/app/dashboard` on mismatch

### API contract

All backend responses are wrapped in `ApiResponse<T>` (`core/models/api-response.model.ts`):
```ts
{ success, message?, data, errorCode?, timestamp }
```

### Key dependencies

| Package | Purpose |
|---|---|
| Angular Material v21 | UI components (M2 theme with teal-700 primary) |
| `@tabler/icons-angular` | Icon set |
| `chart.js` + `ng2-charts` | Charts (for analytics feature) |
| `date-fns` | Date formatting |
| `@auth0/angular-jwt` | JWT utilities |

### User roles

`ROLE_ADMIN`, `ROLE_COORDINADOR` (teacher), `ROLE_ESTUDIANTE` (student). Role checks via `AuthService.hasRole()` / `hasAnyRole()`.

### Styling

Global styles and CSS custom properties live in `src/styles.scss`. Component styles use SCSS. Angular Material M2 theme is initialized there — do not re-initialize it in component files.
