import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Topbar } from '../../shared/components/topbar/topbar';
import { filter, map } from 'rxjs';

// Mapa de rutas → títulos de página
const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/assessment': 'Mis Evaluaciones',
  '/app/analytics': 'Mi Progreso',
  '/app/profile': 'Mi Perfil',
  '/app/questionnaires': 'Cuestionarios',
  '/app/admin/users': 'Gestión de Usuarios',
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    Sidebar, 
    Topbar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private router = inject(Router);

  sidebarOpen = signal(true);
  mobileMenuOpen = signal(false);
  isMobile = signal(window.innerWidth < 768);

  // Título de la página según la ruta activa
  pageTitle = signal('Dashboard');

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        map((e) => (e as NavigationEnd).urlAfterRedirects),
      )
      .subscribe((url) => {
        const title =
          Object.entries(PAGE_TITLES).find(([path]) => url.startsWith(path))?.[1] ?? 'Skill Bridge';
        this.pageTitle.set(title);

        // En móvil, cerrar el menú al navegar
        if (this.isMobile()) this.mobileMenuOpen.set(false);
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (!mobile) this.mobileMenuOpen.set(false);
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileMenuOpen.update((v) => !v);
    } else {
      this.sidebarOpen.update((v) => !v);
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
