import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';



export const appConfig: ApplicationConfig = {
  providers: [
    // Detección de cambios optimizada
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Rutas con binding de inputs habilitado
    provideRouter(routes, withComponentInputBinding()),

    // HTTP con interceptors funcionales (Angular 17+)
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),

    // Animaciones async (mejor rendimiento)
    provideAnimationsAsync(),
  ]
};
