import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { SkillRadarChartComponent } from '../components/skill-radar-chart/skill-radar-chart';
import { ProgressComparison } from '../components/progress-comparison/progress-comparison';
import { EscalationCard } from '../components/escalation-card/escalation-card';
import { catchError, forkJoin, of } from 'rxjs';
import {
  HistorialIntentosResponse,
  EscalamientoResponse,
  InformeProgresoEstudianteResponse,
} from '../../../core/models/analytics.model';
import { AuthService } from '../../../core/auth/auth.service';
import { AnalyticsService } from '../analytics.service';

@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    SkillRadarChartComponent,
    ProgressComparison,
    EscalationCard,
  ],
  templateUrl: './student-progress.html',
  styleUrl: './student-progress.scss',
})
export class StudentProgress implements OnInit {
  private authSvc = inject(AuthService);
  private analyticsSvc = inject(AnalyticsService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  report = signal<InformeProgresoEstudianteResponse | null>(null);
  escalation = signal<EscalamientoResponse | null>(null);
  history = signal<HistorialIntentosResponse[]>([]);

  // TODO: obtener cuestionarios del estudiante dinámicamente
  // Por ahora usamos id=1 como placeholder
  idCuestionario = 1;

  usuarioActual = this.authSvc.currentUser;

  hasPreTest = computed(() => !!this.report()?.idPreTestEvaluacion);
  hasPostTest = computed(() => !!this.report()?.idPostTestEvaluacion);

  overallImprovement = computed(() => {
    const r = this.report();
    if (!r) return null;
    const withDelta = r.skillProgreso.filter((s) => s.porcentajeDelta !== null);
    if (!withDelta.length) return null;
    const avg = withDelta.reduce((sum, s) => sum + (s.porcentajeDelta ?? 0), 0) / withDelta.length;
    return Math.round(avg * 10) / 10;
  });

  allAdvanced = computed(() => {
    const r = this.report();
    if (!r || !r.skillProgreso.length) return false;
    return r.skillProgreso.every((s) => s.postNivel === 'AVANZADO');
  });

  ngOnInit(): void {
    const userId = this.usuarioActual()?.id;
    if (!userId) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      progress: this.analyticsSvc
        .getStudentProgress(userId, this.idCuestionario)
        .pipe(catchError(() => of({ data: null }))),
      escalation: this.analyticsSvc
        .getEscalation(userId, this.idCuestionario)
        .pipe(catchError(() => of({ data: null }))),
      history: this.analyticsSvc
        .getAttemptHistory(userId, this.idCuestionario)
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ progress, escalation, history }) => {
        this.report.set(progress.data);
        this.escalation.set(escalation.data);
        this.history.set(history.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el progreso.');
        this.loading.set(false);
      },
    });
  }

  getSkillLabel(skill: string): string {
    return skill === 'PENSAMIENTO_CRITICO' ? 'Pensamiento Crítico' : 'Adaptabilidad';
  }

  getLevelLabel(level: string | null): string {
    const m: Record<string, string> = {
      BAJO: 'Básico',
      INTERMEDIO: 'Intermedio',
      AVANZADO: 'Avanzado',
    };
    return level ? (m[level] ?? '—') : '—';
  }

  getLevelClass(level: string | null): string {
    return level === 'AVANZADO'
      ? 'level-advanced'
      : level === 'INTERMEDIO'
        ? 'level-intermediate'
        : level === 'BAJO'
          ? 'level-basic'
          : '';
  }

  getAxisLabel(axis: string): string {
    const m: Record<string, string> = {
      ACADEMICO: 'Académico',
      EXPERIMENTAL: 'Experiencial',
      PERSONAL: 'Personal',
    };
    return m[axis] ?? axis;
  }

  getAxisClass(axis: string): string {
    const m: Record<string, string> = {
      ACADEMICO: 'axis-academic',
      EXPERIMENTAL: 'axis-experiential',
      PERSONAL: 'axis-personal',
    };
    return m[axis] ?? '';
  }

  getActionIcon(type: string): string {
    const m: Record<string, string> = {
      LEER: 'menu_book',
      VER: 'play_circle',
      PRACTICAR: 'fitness_center',
    };
    return m[type] ?? 'link';
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatPhase(phase: string): string {
    return phase === 'PRE_TEST' ? 'PRE-TEST' : 'POST-TEST';
  }
}
