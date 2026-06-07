// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from './dashboard.service';
import {
  DashboardStats,
  PendingAction,
  RecentActivity,
  SkillSummary,
} from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private authSvc = inject(AuthService);
  private dashSvc = inject(DashboardService);

  currentUser = this.authSvc.currentUser;
  isStudent = computed(() => this.authSvc.isStudent());
  isTeacher = computed(() => this.authSvc.isTeacher());
  isAdmin = computed(() => this.authSvc.isAdmin());

  loading = signal(true);
  stats = signal<DashboardStats | null>(null);
  skills = signal<SkillSummary[]>([]);

  // Acciones pendientes según el estado del estudiante
  pendingActions = signal<PendingAction[]>([]);

  // Actividad reciente (cargada desde el backend según el rol)
  recentActivity = signal<RecentActivity[]>([]);

  ngOnInit(): void {
    // TODO: obtener questionnaireId dinámicamente desde la API
    const questionnaireId = 1;

    this.dashSvc.loadDashboardData(questionnaireId).subscribe({
      next: ({ stats, skills }) => {
        this.stats.set(stats);
        this.skills.set(skills);
        this.buildPendingActions(stats, skills);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.dashSvc.getActividadReciente().subscribe((activity) => {
      this.recentActivity.set(activity);
    });
  }

  /** Formatea una fecha ISO a texto relativo ("hace 2 días"). */
  getRelativeDate(iso: string): string {
    if (!iso) return '';
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  }

  private buildPendingActions(stats: DashboardStats, skills: SkillSummary[]): void {
    const actions: PendingAction[] = [];

    const hasPost = skills.some((s) => s.postPercentage !== null);

    if (!hasPost) {
      actions.push({
        id: 1,
        title: 'Completar POST_TEST',
        subtitle: 'Mide tu progreso después del plan',
        route: '/app/assessment',
        type: 'primary',
        icon: 'assignment',
      });
    }

    const hasBasic = skills.some((s) => s.level === 'BAJO');
    if (hasBasic) {
      actions.push({
        id: 2,
        title: 'Revisar plan de fortalecimiento',
        subtitle: 'Tienes dimensiones en nivel BAJO',
        route: '/app/analytics',
        type: 'warning',
        icon: 'lightbulb',
      });
    }

    const allAdvanced = skills.length > 0 && skills.every((s) => s.level === 'AVANZADO');
    if (allAdvanced && hasPost) {
      actions.push({
        id: 3,
        title: '¡Certificación disponible!',
        subtitle: 'Alcanzaste nivel AVANZADO en todas las dimensiones',
        route: '/app/analytics',
        type: 'success',
        icon: 'workspace_premium',
      });
    }

    this.pendingActions.set(actions);
  }

  getLevelClass(level: string | null): string {
    const map: Record<string, string> = {
      BAJO: 'level-basic',
      INTERMEDIO: 'level-intermediate',
      AVANZADO: 'level-advanced',
    };
    return level ? (map[level] ?? '') : '';
  }

  getLevelLabel(level: string | null): string {
    const map: Record<string, string> = {
      BAJO: 'Bajo',
      INTERMEDIO: 'Intermedio',
      AVANZADO: 'Avanzado',
    };
    return level ? (map[level] ?? 'Sin evaluar') : 'Sin evaluar';
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getBarColor(pct: number | null): string {
    if (pct === null) return 'var(--border)';
    if (pct >= 70) return 'var(--success)';
    if (pct >= 40) return 'var(--warning)';
    return 'var(--danger)';
  }
}
