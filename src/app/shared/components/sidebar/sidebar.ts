import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
  badge?: number;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly authSvc = inject(AuthService);

  // Input/Output con la nueva API de Angular 21
  collapsed = input(false);
  closeSidebar = output<void>();

  currentUser = this.authSvc.currentUser;
  userRoles = this.authSvc.userRoles;

  avatarSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
  }

  navGroups = computed<NavGroup[]>(() => {
    const roles = this.userRoles();

    const groups: NavGroup[] = [
      {
        items: [
          {
            label: 'Dashboard',
            icon: 'dashboard',
            route: '/app/dashboard',
          },
        ],
      },
    ];

    // Grupo del estudiante
    if (roles.includes('ROLE_ESTUDIANTE')) {
      groups.push({
        title: 'Mi actividad',
        items: [
          {
            label: 'Mis Evaluaciones',
            icon: 'assignment',
            route: '/app/assessment',
          },
          {
            label: 'Mi Progreso',
            icon: 'trending_up',
            route: '/app/analytics',
          },
          {
            label: 'Mi Perfil',
            icon: 'person',
            route: '/app/profile',
          },
        ],
      });
    }

    // Grupos del docente / admin
    if (roles.includes('ROLE_COORDINADOR') || roles.includes('ROLE_ADMIN')) {
      groups.push({
        title: 'Gestión académica',
        items: [
          {
            label: 'Dimensiones',
            icon: 'category',
            route: '/app/dimensions',
          },
          {
            label: 'Banco de Preguntas',
            icon: 'library_books',
            route: '/app/question-bank',
          },
          {
            label: 'Cuestionarios',
            icon: 'quiz',
            route: '/app/questionnaires',
          },
          {
            label: 'Matriz de Puntuación',
            icon: 'grid_on',
            route: '/app/score-matrix',
          },
        ],
      });

      groups.push({
        title: 'Análisis',
        items: [
          {
            label: 'Panel Coordinador',
            icon: 'dashboard_customize',
            route: '/app/teacher',
          },
        ],
      });

      // Vista de estudiantes (solo lectura) — para el coordinador.
      // El admin ya cuenta con el módulo completo "Administración → Usuarios".
      if (roles.includes('ROLE_COORDINADOR') && !roles.includes('ROLE_ADMIN')) {
        groups.push({
          title: 'Otros',
          items: [
            {
              label: 'Usuarios',
              icon: 'group',
              route: '/app/students',
            },
          ],
        });
      }
    }

    // Grupo exclusivo del admin
    if (roles.includes('ROLE_ADMIN')) {
      groups.push({
        title: 'Administración',
        items: [
          {
            label: 'Usuarios',
            icon: 'group',
            route: '/app/admin/users',
          },
        ],
      });
    }

    return groups;
  });

  getRoleBadge(): string {
    const roles = this.userRoles();
    if (roles.includes('ROLE_ADMIN')) return 'Administrador';
    if (roles.includes('ROLE_COORDINADOR')) return 'Coordinador';
    return 'Estudiante';
  }

  getRoleColor(): string {
    const roles = this.userRoles();
    if (roles.includes('ROLE_ADMIN')) return 'role-admin';
    if (roles.includes('ROLE_COORDINADOR')) return 'role-coordinator';
    return 'role-student';
  }

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }

  logout(): void {
    this.authSvc.logout();
  }

  onNavClick(): void {
    // En móvil cerramos el sidebar al navegar
    this.closeSidebar.emit();
  }
}
