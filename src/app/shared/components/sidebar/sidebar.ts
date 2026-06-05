import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/auth/auth.service';

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
  imports: [
    CommonModule, 
    RouterLink, 
    RouterLinkActive, 
    MatIconModule, 
    MatTooltipModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private authSvc = inject(AuthService);
  private router = inject(Router);

  // Input/Output con la nueva API de Angular 21
  collapsed = input(false);
  closeSidebar = output<void>();

  currentUser = this.authSvc.currentUser;
  userRoles = this.authSvc.userRoles;

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
            label: 'Mis evaluaciones',
            icon: 'assignment',
            route: '/app/assessment',
          },
          {
            label: 'Mi progreso',
            icon: 'trending_up',
            route: '/app/analytics',
          },
          {
            label: 'Mi perfil',
            icon: 'person',
            route: '/app/profile',
          },
        ],
      });
    }

    // Grupo del docente / admin
    if (roles.includes('ROLE_COORDINADOR') || roles.includes('ROLE_ADMIN')) {
      groups.push({
        title: 'Gestión académica',
        items: [
          {
            label: 'Cuestionarios',
            icon: 'quiz',
            route: '/app/questionnaires',
          },
          {
            label: 'Reportes de grupo',
            icon: 'bar_chart',
            route: '/app/analytics',
          },
        ],
      });
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
