import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../assessment.service';
import { PreguntaEntregaResponse, CuestionarioEntregaResponse } from '../../../core/models/assessment.model';
import { resolveMediaUrl } from '../../../core/utils/media-url';
import { interval, Subscription } from 'rxjs';

interface Answer {
  idCuestionario: number;
  idsOpcionesSeleccionadas: number[];
  openAnswer: string;
  submitted: boolean;
  isConditional: boolean;
}

@Component({
  selector: 'app-assessment-player',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatCheckboxModule,
  ],
  templateUrl: './assessment-player.html',
  styleUrl: './assessment-player.scss',
})
export class AssessmentPlayer implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentSvc = inject(AssessmentService);

  // ── IDs desde la ruta ──────────────────────────────────────
  idCuestionario = 0;
  idEvaluacion = 0;

  // ── Estado del player ──────────────────────────────────────
  loading = signal(true);
  submitting = signal(false);
  completing = signal(false);
  errorMsg = signal<string | null>(null);

  delivery = signal<CuestionarioEntregaResponse | null>(null);
  currentIndex = signal(0);

  // Pantalla de instrucciones previa a las preguntas (solo si el cuestionario las tiene)
  showIntro = signal(false);

  // Respuestas acumuladas por pregunta
  answers = signal<Map<number, Answer>>(new Map());

  // Temporizador en pantalla
  elapsedSeconds = signal(0);
  private timerSub?: Subscription;

  // Tiempo límite (si el cuestionario lo tiene)
  hasTimeLimit = signal(false);
  remainingSeconds = signal<number | null>(null);
  private timeUpTriggered = false;

  // ── Preguntas visibles (base + condicionales activadas) ────
  visibleQuestions = computed<PreguntaEntregaResponse[]>(() => {
    const d = this.delivery();
    if (!d) return [];

    const base = d.preguntas;
    const answersMap = this.answers();

    // Determinar qué preguntas condicionales están activas
    const activeConditionals = (d.preguntasCondicionales ?? []).filter((cq) =>
      cq.activarCondiciones.some((cond) => {
        const ans = answersMap.get(cond.triggerIdPregunta);
        return ans?.idsOpcionesSeleccionadas.includes(cond.triggerIdOpcion);
      }),
    );

    // Intercalar condicionales después de su trigger
    const result: PreguntaEntregaResponse[] = [];
    for (const q of base) {
      result.push(q);
      const triggered = activeConditionals.filter((cq) =>
        cq.activarCondiciones.some((c) => c.triggerIdPregunta === q.idPregunta),
      );
      result.push(...triggered);
    }

    return result;
  });

  currentQuestion = computed(() => this.visibleQuestions()[this.currentIndex()] ?? null);

  progress = computed(() => {
    const total = this.visibleQuestions().length;
    return total > 0 ? Math.round(((this.currentIndex() + 1) / total) * 100) : 0;
  });

  answeredCount = computed(() => {
    let count = 0;
    this.answers().forEach((a) => {
      if (a.submitted) count++;
    });
    return count;
  });

  currentAnswer = computed<Answer | null>(() => {
    const q = this.currentQuestion();
    return q ? (this.answers().get(q.idPregunta) ?? null) : null;
  });

  canGoNext = computed(() => {
    const q = this.currentQuestion();
    if (!q) return false;
    const ans = this.currentAnswer();

    // DESCRIPTION siempre puede continuar
    if (q.tipoPregunta === 'DESCRIPCION') return true;

    // Si no es obligatoria, puede continuar
    if (!q.obligatoria) return true;

    // Si es obligatoria, necesita respuesta
    return !!ans && ans.idsOpcionesSeleccionadas.length > 0;
  });

  isLastQuestion = computed(() => this.currentIndex() === this.visibleQuestions().length - 1);

  /**
   * Texto de la opción central de una escala LIKERT (el punto medio).
   * Devuelve null si hay menos de 3 opciones (no hay un "medio" claro).
   */
  likertMiddleLabel(opciones: { texto: string }[]): string | null {
    if (!opciones || opciones.length < 3) return null;
    return opciones[Math.floor((opciones.length - 1) / 2)]?.texto ?? null;
  }

  /** Resuelve la URL de la imagen de la pregunta a absoluta (origen del backend). */
  imageSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
  }

  get elapsedFormatted(): string {
    const m = Math.floor(this.elapsedSeconds() / 60);
    const s = this.elapsedSeconds() % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get remainingFormatted(): string {
    const total = this.remainingSeconds() ?? 0;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** true cuando quedan menos de 60s (para resaltar el contador). */
  get timeRunningLow(): boolean {
    return this.hasTimeLimit() && (this.remainingSeconds() ?? 0) <= 60;
  }

  // ── Ciclo de vida ──────────────────────────────────────────

  ngOnInit(): void {
    this.idCuestionario = Number(this.route.snapshot.paramMap.get('questionnaireId'));
    this.idEvaluacion = Number(this.route.snapshot.queryParamMap.get('assessmentId'));

    this.assessmentSvc.deliverQuestionnaire(this.idCuestionario).subscribe({
      next: (res) => {
        this.delivery.set(res.data);
        this.initAnswers(res.data);
        this.loading.set(false);
        // Precargar respuestas y decidir intro/temporizador según sea
        // un inicio limpio o una reanudación.
        this.preloadAnswers();
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el cuestionario.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Trae las respuestas ya guardadas de la sesión y las repinta en el player.
   * En una sesión recién iniciada no hay respuestas → no-op.
   */
  private preloadAnswers(): void {
    // Sin sesión asociada → inicio limpio (puede mostrar instrucciones).
    if (!this.idEvaluacion) {
      this.startFresh();
      return;
    }

    this.assessmentSvc.getAssessment(this.idEvaluacion).subscribe({
      next: (res) => {
        const respuestas = res.data?.respuestas ?? [];
        // Sesión sin respuestas aún → inicio limpio (intro si corresponde).
        if (respuestas.length === 0) {
          this.startFresh();
          return;
        }

        const map = new Map(this.answers());
        for (const r of respuestas) {
          const existing = map.get(r.idPregunta);
          map.set(r.idPregunta, {
            idCuestionario: r.idPregunta,
            idsOpcionesSeleccionadas: r.idsOpcionesSeleccionadas ?? [],
            openAnswer: r.respuestaAbierta ?? '',
            submitted: true,
            isConditional: existing?.isConditional ?? false,
          });
        }
        this.answers.set(map);

        // Al reanudar una sesión aleatorizada, agrupar las preguntas YA
        // respondidas al inicio (en orden estable por id) y dejar solo las NO
        // respondidas con el orden aleatorio de esta entrega. Así las respondidas
        // no aparecen intercaladas ni al final, y solo se re-aleatorizan las
        // pendientes. Las condicionales las reintercala visibleQuestions().
        const d = this.delivery();
        if (d) {
          const ans = this.answers();
          const answered = d.preguntas
            .filter((q) => ans.get(q.idPregunta)?.submitted)
            .sort((a, b) => a.idPregunta - b.idPregunta);
          const unanswered = d.preguntas.filter((q) => !ans.get(q.idPregunta)?.submitted);
          if (answered.length > 0) {
            this.delivery.set({ ...d, preguntas: [...answered, ...unanswered] });
          }
        }

        // Posicionarse en la primera pregunta sin responder.
        // Si todas están respondidas, ir a la última para poder completar.
        const questions = this.visibleQuestions();
        if (questions.length > 0) {
          const firstUnanswered = questions.findIndex(
            (q) => !this.answers().get(q.idPregunta)?.submitted,
          );
          this.currentIndex.set(
            firstUnanswered === -1 ? questions.length - 1 : firstUnanswered,
          );
        }

        // Reanudación con progreso: NO mostrar instrucciones; ir directo a la
        // siguiente pregunta sin responder y arrancar el temporizador/conteo.
        this.showIntro.set(false);
        this.onAnsweringStarted();
      },
      // Si falla la precarga, el player sigue funcionando: inicio limpio.
      error: () => this.startFresh(),
    });
  }

  /**
   * Inicio limpio (sin progreso previo): muestra las instrucciones primero si
   * el cuestionario las tiene; si no, arranca las preguntas y el temporizador.
   */
  private startFresh(): void {
    if (this.delivery()?.instrucciones) {
      this.showIntro.set(true);
    } else {
      this.onAnsweringStarted();
    }
  }

  /** Cierra la pantalla de instrucciones y arranca las preguntas + temporizador. */
  beginQuestions(): void {
    this.showIntro.set(false);
    this.onAnsweringStarted();
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  private initAnswers(delivery: CuestionarioEntregaResponse): void {
    const map = new Map<number, Answer>();
    const allQ = [...delivery.preguntas, ...(delivery.preguntasCondicionales ?? [])];
    for (const q of allQ) {
      map.set(q.idPregunta, {
        idCuestionario: q.idPregunta,
        idsOpcionesSeleccionadas: [],
        openAnswer: '',
        submitted: false,
        isConditional: q.activarCondiciones.length > 0,
      });
    }
    this.answers.set(map);
  }

  private startTimer(): void {
    this.timerSub = interval(1000).subscribe(() => {
      this.elapsedSeconds.update((s) => s + 1);

      // Cuenta regresiva del tiempo límite (si aplica).
      if (this.hasTimeLimit()) {
        const restante = (this.remainingSeconds() ?? 0) - 1;
        this.remainingSeconds.set(Math.max(0, restante));
        if (restante <= 0 && !this.timeUpTriggered) {
          this.timeUpTriggered = true;
          this.onTimeUp();
        }
      }
    });
  }

  /**
   * Se llama cuando el estudiante EMPIEZA a responder (tras instrucciones, o
   * directo si no hay). Arranca el temporizador y, si el cuestionario tiene
   * tiempo límite, ancla/consulta el conteo en el servidor.
   */
  private onAnsweringStarted(): void {
    this.startTimer();

    const limite = this.delivery()?.tiempoLimiteMinutos;
    if (!limite || !this.idEvaluacion) return;

    this.assessmentSvc.iniciarConteo(this.idEvaluacion).subscribe({
      next: (res) => {
        const restante = res.data?.segundosRestantes;
        if (restante == null) return;
        this.hasTimeLimit.set(true);
        this.remainingSeconds.set(Math.max(0, restante));
        if (restante <= 0 && !this.timeUpTriggered) {
          this.timeUpTriggered = true;
          this.onTimeUp();
        }
      },
      error: () => {},
    });
  }

  /** Tiempo agotado: cierra la sesión automáticamente y va a resultados. */
  private onTimeUp(): void {
    this.timerSub?.unsubscribe();
    this.completing.set(true);
    this.autoCompletarPorTiempo(0);
  }

  /**
   * Cierra la sesión por tiempo. Si el servidor aún no considera vencido el
   * deadline (desfase de red), reintenta una vez tras 2s antes de navegar.
   */
  private autoCompletarPorTiempo(intento: number): void {
    this.assessmentSvc.completeAssessment(this.idEvaluacion).subscribe({
      next: () => {
        this.completing.set(false);
        this.router.navigate(['/app/assessment', this.idEvaluacion, 'result'], {
          queryParams: { timeUp: '1' },
        });
      },
      error: () => {
        if (intento < 1) {
          // El servidor puede ir 1-2s atrás: esperar y reintentar una vez.
          setTimeout(() => this.autoCompletarPorTiempo(intento + 1), 2000);
        } else {
          this.completing.set(false);
          this.router.navigate(['/app/assessment', this.idEvaluacion, 'result'], {
            queryParams: { timeUp: '1' },
          });
        }
      },
    });
  }

  // ── Manejo de respuestas ───────────────────────────────────

  onSingleSelect(optionId: number): void {
    const q = this.currentQuestion();
    if (!q) return;
    this.updateAnswer(q.idPregunta, { idsOpcionesSeleccionadas: [optionId] });
  }

  onMultiSelect(optionId: number, checked: boolean): void {
    const q = this.currentQuestion();
    if (!q) return;
    const current = this.currentAnswer()?.idsOpcionesSeleccionadas ?? [];

    let next: number[];
    if (checked) {
      const max = q.maxOpciones ?? Infinity;
      if (current.length >= max) return;
      next = [...current, optionId];
    } else {
      next = current.filter((id) => id !== optionId);
    }

    this.updateAnswer(q.idPregunta, { idsOpcionesSeleccionadas: next });
  }

  onTextInput(text: string): void {
    const q = this.currentQuestion();
    if (!q) return;
    this.updateAnswer(q.idPregunta, { openAnswer: text });
  }

  isOptionSelected(optionId: number): boolean {
    return this.currentAnswer()?.idsOpcionesSeleccionadas.includes(optionId) ?? false;
  }

  isMultiDisabled(optionId: number): boolean {
    const q = this.currentQuestion();
    if (!q?.maxOpciones) return false;
    const selected = this.currentAnswer()?.idsOpcionesSeleccionadas ?? [];
    return selected.length >= q.maxOpciones && !selected.includes(optionId);
  }

  private updateAnswer(questionId: number, partial: Partial<Answer>): void {
    const map = new Map(this.answers());
    const existing = map.get(questionId) ?? {
      idCuestionario: questionId,
      idsOpcionesSeleccionadas: [],
      openAnswer: '',
      submitted: false,
      isConditional: false,
    };
    map.set(questionId, { ...existing, ...partial });
    this.answers.set(map);
  }

  // ── Navegación ─────────────────────────────────────────────

  next(): void {
    this.submitCurrentAnswer(() => {
      if (!this.isLastQuestion()) {
        this.currentIndex.update((i) => i + 1);
      }
    });
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  // ── Enviar respuesta al backend ────────────────────────────

  private submitCurrentAnswer(onSuccess: () => void): void {
    const q = this.currentQuestion();
    const ans = this.currentAnswer();
    if (!q || !ans) {
      onSuccess();
      return;
    }

    // DESCRIPTION vacía → continuar sin enviar
    if (q.tipoPregunta === 'DESCRIPCION' && !ans.openAnswer.trim()) {
      onSuccess();
      return;
    }

    // Sin opciones seleccionadas y no obligatoria → continuar
    if (ans.idsOpcionesSeleccionadas.length === 0 && !q.obligatoria && q.tipoPregunta !== 'DESCRIPCION') {
      onSuccess();
      return;
    }

    this.submitting.set(true);

    const request = {
      idPregunta: q.idPregunta,
      idsOpcionesSeleccionadas:
        q.tipoPregunta === 'DESCRIPCION' ? undefined : ans.idsOpcionesSeleccionadas,
      respuestaAbierta: q.tipoPregunta === 'DESCRIPCION' ? ans.openAnswer?.trim() : undefined,
    };

    const action$ = ans.submitted
      ? this.assessmentSvc.updateAnswer(this.idEvaluacion, q.idPregunta, request)
      : this.assessmentSvc.submitAnswer(this.idEvaluacion, request);

    action$.subscribe({
      next: () => {
        this.updateAnswer(q.idPregunta, { submitted: true });
        this.submitting.set(false);
        onSuccess();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar la respuesta.');
      },
    });
  }

  // ── Completar evaluación ───────────────────────────────────

  complete(): void {
    // Enviar la última respuesta y luego completar
    this.submitCurrentAnswer(() => {
      this.completing.set(true);
      this.assessmentSvc.completeAssessment(this.idEvaluacion).subscribe({
        next: () => {
          this.completing.set(false);
          this.router.navigate(['/app/assessment', this.idEvaluacion, 'result']);
        },
        error: (err) => {
          this.completing.set(false);
          this.errorMsg.set(err?.error?.message ?? 'Error al completar la evaluación.');
        },
      });
    });
  }
}
