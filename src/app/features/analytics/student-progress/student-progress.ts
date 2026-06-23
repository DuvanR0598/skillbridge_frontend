import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
export class StudentProgress implements OnInit, OnDestroy {

  // Clave de sessionStorage donde se guarda la posición de scroll para
  // restaurarla al volver (p. ej. desde "Ver resultado").
  private static readonly SCROLL_KEY = 'student-progress-scroll';

  // Posición de scroll pendiente de restaurar tras la carga inicial.
  private pendingScroll: number | null = null;
  // Última posición de scroll observada (capturada de forma continua para que
  // sea fiable aunque el navegador resetee el contenedor al desmontar la vista).
  private lastScrollTop = 0;
  private scrollHandler?: () => void;
  private authSvc = inject(AuthService);
  private analyticsSvc = inject(AnalyticsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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
    // Desactivar la restauración de scroll automática del navegador: en SPAs
    // con contenedor scrolleable propio (.content-area) el navegador resetea
    // la posición a 0 al volver con atrás/adelante, pisando nuestra restauración.
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Recuperar la posición de scroll guardada al salir (si la hay) para
    // restaurarla una sola vez tras la carga inicial.
    const saved = sessionStorage.getItem(StudentProgress.SCROLL_KEY);
    this.pendingScroll = saved !== null ? Number(saved) : null;
    sessionStorage.removeItem(StudentProgress.SCROLL_KEY);

    // Observar el scroll del contenedor de forma continua. Así, al salir,
    // guardamos la última posición real (el navegador puede poner scrollTop=0
    // al desmontar el contenido antes de que se ejecute ngOnDestroy).
    const scrollEl = this.scrollContainer();
    if (scrollEl) {
      this.scrollHandler = () => { this.lastScrollTop = scrollEl.scrollTop; };
      scrollEl.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

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
        // Restaurar el cuestionario que el estudiante estaba viendo (query param),
        // por ejemplo al volver desde "Ver resultado". Si no es válido, usar el primero.
        const fromUrl = Number(this.route.snapshot.queryParamMap.get('cuestionario'));
        const initialId = list.some((q) => q.idCuestionario === fromUrl)
          ? fromUrl
          : list[0].idCuestionario;
        this.selectedId.set(initialId);
        this.syncUrl(initialId);
        this.loadProgress(initialId);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar tu progreso.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    // Guardar la última posición de scroll observada al abandonar la vista
    // (p. ej. al ir a "Ver resultado") para poder restaurarla al volver.
    const el = this.scrollContainer();
    if (this.scrollHandler && el) {
      el.removeEventListener('scroll', this.scrollHandler);
    }
    sessionStorage.setItem(StudentProgress.SCROLL_KEY, String(this.lastScrollTop));
  }

  /** Contenedor con scroll del layout principal (.content-area tiene overflow-y: auto). */
  private scrollContainer(): HTMLElement | null {
    return document.querySelector('.content-area');
  }

  /**
   * Restaura una sola vez la posición de scroll guardada.
   *
   * El contenido (gráfico radar, tablas, planes) se renderiza de forma
   * asíncrona, por lo que al terminar la carga la altura todavía no es la
   * definitiva. Reintentamos durante un breve lapso hasta alcanzar el destino
   * (o agotar los intentos): mientras el contenido siga creciendo, el scrollTop
   * queda topado por debajo del objetivo y se vuelve a intentar.
   */
  private restorePendingScroll(): void {
    if (this.pendingScroll === null) return;
    const target = this.pendingScroll;
    this.pendingScroll = null;
    if (target <= 0) return;

    let attempts = 0;
    const maxAttempts = 15;

    const tryRestore = () => {
      const el = this.scrollContainer();
      if (el) {
        el.scrollTop = target;
        // Si aún no se alcanzó (contenido todavía creciendo), reintentar.
        if (Math.abs(el.scrollTop - target) > 2 && attempts < maxAttempts) {
          attempts++;
          setTimeout(tryRestore, 90);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryRestore, 90);
      }
    };

    requestAnimationFrame(tryRestore);
  }

  /** Cambia el cuestionario seleccionado y recarga su progreso. */
  onSelectQuestionnaire(idCuestionario: number): void {
    if (idCuestionario === this.selectedId()) return;
    this.selectedId.set(idCuestionario);
    this.syncUrl(idCuestionario);
    this.loadProgress(idCuestionario);
  }

  /**
   * Refleja el cuestionario seleccionado en la URL (query param 'cuestionario')
   * para que al navegar a "Ver resultado" y volver, se restaure el mismo cuestionario.
   * replaceUrl evita ensuciar el historial del navegador.
   */
  private syncUrl(idCuestionario: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cuestionario: idCuestionario },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
        this.restorePendingScroll();
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

  /** Genera el PDF del reporte de progreso vía el diálogo de impresión del navegador. */
  exportPdf(): void {
    document.body.classList.add('print-progress');
    window.print();
    document.body.classList.remove('print-progress');
  }
}
