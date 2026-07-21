// group-report/group-report.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { skillMeta } from '../../../core/models/dimension.model';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { forkJoin, catchError, of } from 'rxjs';
import { TeacherAnalyticsService } from '../teacher-analytics.service';
import {
  ReporteGrupoResponse,
  EstudianteQueNecesitaApoyoResponse,
  NivelEstudianteResumenResponse,
} from '../../../core/models/teacher-analytics.model';
import { PlanActual } from '../../../core/models/analytics.model';
import { DetalleRespuestaResponse } from '../../../core/models/assessment.model';

interface StudentGroup {
  idEstudiante: number;
  nombreCompleto: string | null;
  email: string | null;
  rows: NivelEstudianteResumenResponse[];
}
import { LevelDistributionChart } from '../components/level-distribution-chart/level-distribution-chart';
import { DimensionAnalysisTable } from '../components/dimension-analysis-table/dimension-analysis-table';
import { StudentsSupportList} from '../components/students-support-list/students-support-list';

@Component({
  selector: 'app-group-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    LevelDistributionChart,
    DimensionAnalysisTable,
    StudentsSupportList,
  ],
  templateUrl: './group-report.html',
  styleUrl: './group-report.scss',
})
export class GroupReportComponent implements OnInit {
  protected readonly skillMeta = skillMeta;
  private route = inject(ActivatedRoute);
  private teacherSvc = inject(TeacherAnalyticsService);

  loading = signal(true);
  report = signal<ReporteGrupoResponse | null>(null);
  needingSupport = signal<EstudianteQueNecesitaApoyoResponse[]>([]);
  errorMsg = signal<string | null>(null);
  questionnaireId = 0;

  // Maestro-detalle de resultados individuales
  selectedStudentId = signal<number | null>(null);
  selectedPhase = signal<'PRE_TEST' | 'POST_TEST'>('PRE_TEST');

  /** Estudiantes que realizaron el cuestionario, agrupando sus resultados. */
  studentGroups = computed<StudentGroup[]>(() => {
    const rows = this.report()?.resumenEstudiantes ?? [];
    const map = new Map<number, StudentGroup>();
    for (const r of rows) {
      let g = map.get(r.idEstudiante);
      if (!g) {
        g = {
          idEstudiante: r.idEstudiante,
          nombreCompleto: r.nombreCompleto ?? null,
          email: r.email ?? null,
          rows: [],
        };
        map.set(r.idEstudiante, g);
      }
      g.rows.push(r);
    }
    return [...map.values()];
  });

  selectedStudent = computed<StudentGroup | null>(() =>
    this.studentGroups().find((g) => g.idEstudiante === this.selectedStudentId()) ?? null,
  );

  /** % real de estudiantes con nivel AVANZADO en POST_TEST */
  pcAlcanzaronAvanzado = computed<number | null>(() => {
    const r = this.report();
    if (!r) return null;
    // Denominador real: total estudiantes que hicieron POST_TEST según el reporte
    const total = r.totalEstudiantesConPostTest;
    if (total === 0) return null;

    const postRows = r.resumenEstudiantes.filter((e) => e.fase === 'POST_TEST');

    // Preferir filas globales (sin dimensión → fila resumen del estudiante)
    const globalPost = postRows.filter((e) => e.idDimension == null);
    if (globalPost.length > 0) {
      const conAvanzado = globalPost.filter((e) => e.nivel === 'AVANZADO').length;
      return (conAvanzado / total) * 100;
    }

    // Sin filas globales: un estudiante "alcanzó AVANZADO" solo si TODAS sus
    // dimensiones POST_TEST son AVANZADO
    const estudiantesPost = [...new Set(postRows.map((e) => e.idEstudiante))];
    const conTodosAvanzado = estudiantesPost.filter((id) =>
      postRows.filter((e) => e.idEstudiante === id).every((e) => e.nivel === 'AVANZADO')
    ).length;
    return (conTodosAvanzado / total) * 100;
  });

  /** Filas del estudiante seleccionado para la fase elegida. */
  selectedRows = computed<NivelEstudianteResumenResponse[]>(() =>
    (this.selectedStudent()?.rows ?? []).filter((r) => r.fase === this.selectedPhase()),
  );

  // Plan de mejoramiento del estudiante seleccionado
  showPlan = signal(false);
  planLoading = signal(false);
  planError = signal<string | null>(null);
  studentPlan = signal<PlanActual[]>([]);

  // Respuestas del estudiante (PRE/POST) — endpoint /evaluacion/consultar-id
  showAnswers = signal(false);
  answersLoading = signal(false);
  answersError = signal<string | null>(null);
  answers = signal<DetalleRespuestaResponse[]>([]);

  selectStudent(id: number): void {
    this.selectedStudentId.set(id);
    // Por defecto mostrar PRE_TEST si existe, si no POST_TEST.
    const fases = (this.selectedStudent()?.rows ?? []).map((r) => r.fase);
    this.selectedPhase.set(fases.includes('PRE_TEST') ? 'PRE_TEST' : 'POST_TEST');
    // Reset de paneles al cambiar de estudiante.
    this.showPlan.set(false);
    this.studentPlan.set([]);
    this.planError.set(null);
    this.resetAnswers();
  }

  private resetAnswers(): void {
    this.showAnswers.set(false);
    this.answers.set([]);
    this.answersError.set(null);
  }

  /** id de la sesión (evaluación) del estudiante para la fase seleccionada. */
  private selectedEvaluacionId(): number | null {
    return this.selectedRows()[0]?.idEvaluacion ?? null;
  }

  /** Carga/oculta las respuestas del estudiante en la fase seleccionada. */
  toggleAnswers(): void {
    if (this.showAnswers()) {
      this.showAnswers.set(false);
      return;
    }
    const idEval = this.selectedEvaluacionId();
    if (idEval == null) {
      this.answersError.set('No hay una evaluación para esta fase.');
      this.showAnswers.set(true);
      return;
    }

    this.showAnswers.set(true);
    this.answersLoading.set(true);
    this.answersError.set(null);
    this.teacherSvc.getEvaluationDetail(idEval).subscribe({
      next: (res) => {
        this.answers.set(res.data?.respuestas ?? []);
        this.answersLoading.set(false);
      },
      error: () => {
        this.answersError.set('No se pudieron cargar las respuestas.');
        this.answersLoading.set(false);
      },
    });
  }

  /** Cambia la fase y resetea el panel de respuestas (cambia la sesión). */
  setPhase(phase: 'PRE_TEST' | 'POST_TEST'): void {
    this.selectedPhase.set(phase);
    this.resetAnswers();
  }

  clearStudent(): void {
    this.selectedStudentId.set(null);
    this.showPlan.set(false);
  }

  /** Carga y muestra el plan de mejoramiento del estudiante seleccionado. */
  togglePlan(): void {
    const id = this.selectedStudentId();
    if (id == null) return;

    // Si ya está visible, ocultar.
    if (this.showPlan()) {
      this.showPlan.set(false);
      return;
    }

    this.showPlan.set(true);
    // Cargar solo la primera vez.
    if (this.studentPlan().length > 0 || this.planLoading()) return;

    this.planLoading.set(true);
    this.planError.set(null);
    this.teacherSvc.getStudentProgress(id, this.questionnaireId).subscribe({
      next: (res) => {
        // El backend puede repetir el mismo plan (varias dimensiones comparten
        // la misma entrada de matriz). Deduplicar por id.
        const planes = res.data?.planActual ?? [];
        const unicos = Array.from(new Map(planes.map((p) => [p.id, p])).values());
        this.studentPlan.set(unicos);
        this.planLoading.set(false);
      },
      error: () => {
        this.planError.set('No se pudo cargar el plan de mejoramiento.');
        this.planLoading.set(false);
      },
    });
  }

  getAxisLabel(axis: string): string {
    const m: Record<string, string> = {
      ACADEMICO: 'Académico',
      EXPERIMENTAL: 'Experiencial',
      PERSONAL: 'Personal',
    };
    return m[axis] ?? axis;
  }

  getActionLabel(tipo: string): string {
    const m: Record<string, string> = {
      LEER: 'Leer',
      VER: 'Ver',
      PRACTICAR: 'Practicar',
    };
    return m[tipo?.trim()] ?? tipo;
  }

  studentHasPhase(phase: 'PRE_TEST' | 'POST_TEST'): boolean {
    return (this.selectedStudent()?.rows ?? []).some((r) => r.fase === phase);
  }

  ngOnInit(): void {
    this.questionnaireId = Number(this.route.snapshot.paramMap.get('questionnaireId'));

    forkJoin({
      report: this.teacherSvc
        .getGroupReport(this.questionnaireId)
        .pipe(catchError(() => of({ data: null }))),
      support: this.teacherSvc
        .getStudentsNeedingSupport(this.questionnaireId)
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ report, support }) => {
        this.report.set(report.data);
        this.needingSupport.set(support.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el reporte.');
        this.loading.set(false);
      },
    });
  }

  formatPct(val: number | null): string {
    return val != null ? val.toFixed(1) + '%' : '—';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  exportPdf(): void {
    document.body.classList.add('print-group-report');
    window.print();
    document.body.classList.remove('print-group-report');
  }
}
