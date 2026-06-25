// questionnaire-builder/questionnaire-builder.component.ts

import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { QuestionForm } from '../question-form/question-form';
import { BranchingEditor } from '../branching-editor/branching-editor';
import { QuestionnairesService } from '../questionnaires.service';

import {
  CuestionarioResponse,
  PreguntaResponse,
  PreguntaDeCuestionarioResponse,
  QuestionCondition,
  QuestionnaireQuestion,
} from '../../../core/models/questionnaire-admin.model';

@Component({
  selector: 'app-questionnaire-builder',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    QuestionForm,
    BranchingEditor,
  ],
  templateUrl: './questionnaire-builder.html',
  styleUrl: './questionnaire-builder.scss',
})
export class QuestionnaireBuilder implements OnInit {
  // ============================================
  // 1. INYECCIONES
  // ============================================
  private route = inject(ActivatedRoute);
  private svc   = inject(QuestionnairesService);
  private toast = inject(MessageService);

  // ============================================
  // 2. SIGNALS - Estado UI
  // ============================================
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal<string | null>(null);
  showNewQuestionForm = signal(false);
  bankSearch = signal('');
  filterType = signal<string>('ALL');
  filterSkill = signal<'ALL' | 'PENSAMIENTO_CRITICO' | 'ADAPTABILIDAD'>('ALL');
  filterDimension = signal<number | 'ALL' | 'NONE'>('ALL');

  // ============================================
  // 3. SIGNALS - Datos principales
  // ============================================
  questionnaire = signal<CuestionarioResponse | null>(null);
  bankQuestions = signal<PreguntaResponse[]>([]);
  questionnaireQuestions = signal<PreguntaDeCuestionarioResponse[]>([]);
  questionnaireId = signal(0);

  // ============================================
  // 4. SIGNALS - Branching / Condiciones
  // ============================================
  qqQuestions = signal<QuestionnaireQuestion[]>([]);
  conditions = signal<QuestionCondition[]>([]);

  // ============================================
  // 5. COMPUTED - Valores derivados
  // ============================================
  /**
   * IDs de preguntas ya agregadas al cuestionario
   */
  addedQuestionIds = computed(() => {
    return new Set(this.qqQuestions().map((q) => q.idPregunta));
  });

  /**
   * Preguntas del banco que aún NO están en el cuestionario
   */
  availableBank = computed(() => {
    const added = this.addedQuestionIds();
    return this.bankQuestions().filter((q) => !added.has(q.idPregunta));
  });

  /** Dimensiones únicas presentes en el banco disponible */
  bankDimensions = computed(() => {
    const map = new Map<number, string>();
    for (const q of this.availableBank()) {
      if (q.dimension) map.set(q.dimension.id, q.dimension.nombre);
    }
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  });

  /** Tipos únicos presentes en el banco disponible */
  bankTypes = computed(() =>
    [...new Set(this.availableBank().map((q) => q.tipoPregunta))]
  );

  /** Banco filtrado por texto, tipo, skill y dimensión */
  filteredBank = computed(() => {
    const term  = this.bankSearch().toLowerCase().trim();
    const type  = this.filterType();
    const skill = this.filterSkill();
    const dim   = this.filterDimension();
    return this.availableBank().filter((q) => {
      if (term && !q.texto.toLowerCase().includes(term)) return false;
      if (type !== 'ALL' && q.tipoPregunta !== type) return false;
      if (skill !== 'ALL' && q.dimension?.skill !== skill) return false;
      if (dim === 'NONE' && q.dimension != null) return false;
      if (typeof dim === 'number' && q.dimension?.id !== dim) return false;
      return true;
    });
  });

  // ============================================
  // 6. CICLO DE VIDA
  // ============================================
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.questionnaireId.set(id);
    this.loadData();
  }

  // ============================================
  // 7. CARGA DE DATOS
  // ============================================
  loadData(): void {
    this.loading.set(true);

    forkJoin({
      // Cuestionario base
      questionnaire: this.svc
        .getById(this.questionnaireId())
        .pipe(catchError(() => of({ data: null }))),

      // Banco de preguntas completo (sin paginación)
      bank: this.svc.getAllQuestions().pipe(catchError(() => of({ data: [] as PreguntaResponse[] }))),

      // Preguntas del cuestionario
      qqQuestions: this.svc
        .getQuestionsOfQuestionnaire(this.questionnaireId())
        .pipe(catchError(() => of({ data: [] }))),

      // Condiciones de ramificación
      conditions: this.svc
        .listConditions(this.questionnaireId())
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ questionnaire, bank, qqQuestions, conditions }) => {
        // Datos del cuestionario
        this.questionnaire.set(questionnaire.data);

        this.bankQuestions.set(bank.data ?? []);

        // Preguntas del cuestionario
        const qqData: QuestionnaireQuestion[] = qqQuestions.data ?? [];
        this.qqQuestions.set(qqData);

        // También actualizar questionnaireQuestions para compatibilidad
        this.questionnaireQuestions.set(qqData as unknown as PreguntaDeCuestionarioResponse[]);

        // Condiciones (cargadas desde el endpoint de ramificación)
        this.conditions.set(conditions.data ?? []);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.errorMsg.set('Error al cargar los datos del cuestionario.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Refresca los datos del cuestionario y sus preguntas
   */
  private refreshAll(): void {
    forkJoin({
      questionnaire: this.svc
        .getById(this.questionnaireId())
        .pipe(catchError(() => of({ data: null }))),
      qqQuestions: this.svc
        .getQuestionsOfQuestionnaire(this.questionnaireId())
        .pipe(catchError(() => of({ data: [] }))),
      conditions: this.svc
        .listConditions(this.questionnaireId())
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ questionnaire, qqQuestions, conditions }) => {
        if (questionnaire.data) {
          this.questionnaire.set(questionnaire.data);
        }

        const qqData: QuestionnaireQuestion[] = qqQuestions.data ?? [];
        this.qqQuestions.set(qqData);
        this.questionnaireQuestions.set(qqData as unknown as PreguntaDeCuestionarioResponse[]);

        // Condiciones actualizadas desde el backend
        this.conditions.set(conditions.data ?? []);
      },
      error: (err) => {
        console.error('Error refreshing data:', err);
      },
    });
  }

  // ============================================
  // 8. MANEJO DE PREGUNTAS DEL BANCO
  // ============================================
  /**
   * Agregar pregunta del banco al cuestionario
   */
  addFromBank(questionId: number): void {
    this.saving.set(true);
    this.clearMessages();

    this.svc
      .addQuestion(this.questionnaireId(), {
        idpregunta: questionId,
        obligatoria: true,
        peso: 1,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.add({ severity: 'success', summary: 'Pregunta agregada', detail: 'La pregunta se agregó al cuestionario.' });
          this.refreshAll();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Error al agregar la pregunta.' });
        },
      });
  }

  /**
   * Quitar pregunta del cuestionario
   */
  removeQuestion(questionId: number): void {
    this.saving.set(true);
    this.clearMessages();

    this.svc.removeQuestion(this.questionnaireId(), questionId).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Pregunta removida', detail: 'La pregunta se quitó del cuestionario.' });
        this.refreshAll();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Error al quitar la pregunta.' });
      },
    });
  }

  // ============================================
  // 9. CREACIÓN DE NUEVAS PREGUNTAS
  // ============================================
  /**
   * Callback cuando se crea una nueva pregunta desde el formulario
   */
  onQuestionCreated(question: PreguntaResponse): void {
    // Agregar al banco local
    this.bankQuestions.update((list) => [question, ...list]);
    this.showNewQuestionForm.set(false);

    // Agregar automáticamente al cuestionario
    this.addFromBank(question.idPregunta);
  }

  // ============================================
  // 10. CONDICIONES (BRANCHING)
  // ============================================
  /**
   * Handler cuando se crea una nueva condición
   */
  onConditionCreated(condition: QuestionCondition): void {
    this.conditions.update((list) => [...list, condition]);
    // Refrescar para obtener el ID real del backend si es necesario
    this.refreshAll();
  }

  /**
   * Handler cuando se actualiza una condición existente
   */
  onConditionUpdated(_condition: QuestionCondition): void {
    this.refreshAll();
  }

  /**
   * Handler cuando se elimina una condición
   */
  onConditionDeleted(conditionId: number): void {
    this.conditions.update((list) => list.filter((c) => c.id !== conditionId));
    this.refreshAll();
  }

  // ============================================
  // 11. ACCIONES DEL CUESTIONARIO
  // ============================================
  /**
   * Completar el cuestionario (cambiar estado a COMPLETO)
   */
  completeQuestionnaire(): void {
    this.saving.set(true);
    this.clearMessages();

    this.svc.complete(this.questionnaireId()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.questionnaire.set(res.data);
        this.toast.add({ severity: 'success', summary: 'Cuestionario completado', detail: 'El cuestionario se marcó como COMPLETO.' });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Error al completar el cuestionario.' });
      },
    });
  }

  // ============================================
  // 12. UTILIDADES
  // ============================================
  /**
   * Verifica si una pregunta ya está agregada al cuestionario
   */
  isAdded(id: number): boolean {
    return this.addedQuestionIds().has(id);
  }

  /**
   * Retorna la etiqueta legible del tipo de pregunta
   */
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      VERDADERO_FALSO: 'V/F',
      LIKERT: 'Likert',
      OPCION_UNICA: 'Única',
      OPCION_MULTIPLE: 'Múltiple',
      DESCRIPCION: 'Texto',
    };
    return labels[type] ?? type;
  }

  /**
   * Retorna la clase CSS para el tipo de pregunta
   */
  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      VERDADERO_FALSO: 'type-tf',
      LIKERT: 'type-lk',
      OPCION_UNICA: 'type-sc',
      OPCION_MULTIPLE: 'type-mc',
      DESCRIPCION: 'type-desc',
    };
    return classes[type] ?? '';
  }

  private clearMessages(): void {
    this.errorMsg.set(null);
  }

  getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BORRADOR: 'Borrador',
    COMPLETO: 'Completo',
    PUBLICADO: 'Publicado',
    ARCHIVADO: 'Archivado',
    ELIMINADO: 'Eliminado'
  };
  return labels[status] ?? status;
}
}
