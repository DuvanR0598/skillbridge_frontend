import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
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
import { AnalyticsService, EvaluatedQuestionnaire } from '../analytics.service';

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
    MatFormFieldModule,
    MatTooltipModule,
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

  // Cuestionarios que el estudiante ha evaluado + el seleccionado.
  questionnaires = signal<EvaluatedQuestionnaire[]>([]);
  selectedId = signal<number | null>(null);

  usuarioActual = this.authSvc.currentUser;

  hasPreTest = computed(() => !!this.report()?.idPreTestEvaluacion);
  hasPostTest = computed(() => !!this.report()?.idPostTestEvaluacion);

  /** Plan de mejoramiento sin duplicados (varias dimensiones comparten plan). */
  planActual = computed(() => {
    const planes = this.report()?.planActual ?? [];
    return Array.from(new Map(planes.map((p) => [p.id, p])).values());
  });

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

    this.analyticsSvc.getEvaluatedQuestionnaires(userId).subscribe({
      next: (list) => {
        this.questionnaires.set(list);
        if (list.length === 0) {
          // Sin evaluaciones → estado vacío
          this.errorMsg.set('Aún no has completado ninguna evaluación.');
          this.loading.set(false);
          return;
        }
        this.selectedId.set(list[0].idCuestionario);
        this.loadProgress(list[0].idCuestionario);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar tu progreso.');
        this.loading.set(false);
      },
    });
  }

  /** Cambia el cuestionario seleccionado y recarga su progreso. */
  onSelectQuestionnaire(idCuestionario: number): void {
    if (idCuestionario === this.selectedId()) return;
    this.selectedId.set(idCuestionario);
    this.loadProgress(idCuestionario);
  }

  private loadProgress(idCuestionario: number): void {
    const userId = this.usuarioActual()?.id;
    if (!userId) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    forkJoin({
      progress: this.analyticsSvc
        .getStudentProgress(userId, idCuestionario)
        .pipe(catchError(() => of({ data: null }))),
      escalation: this.analyticsSvc
        .getEscalation(userId, idCuestionario)
        .pipe(catchError(() => of({ data: null }))),
      history: this.analyticsSvc
        .getAttemptHistory(userId, idCuestionario)
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
