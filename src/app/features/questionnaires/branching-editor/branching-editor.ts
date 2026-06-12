import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnChanges, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuestionnairesService } from '../questionnaires.service';
import { CondicionPreguntaRequest, OptionResponse, PreguntaResponse, QuestionCondition, QuestionnaireQuestion } from '../../../core/models/questionnaire-admin.model';

@Component({
  selector: 'app-branching-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatSelectModule, MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './branching-editor.html',
  styleUrl: './branching-editor.scss',
})
export class BranchingEditor implements OnChanges {

  private svc = inject(QuestionnairesService);

  // Inputs
  questionnaireId    = input.required<number>();
  // Todas las preguntas del cuestionario (base + condicionales)
  allQuestions       = input<QuestionnaireQuestion[]>([]);
  // Banco de preguntas completo (para obtener las opciones)
  bankQuestions      = input<PreguntaResponse[]>([]);
  // Condiciones ya existentes en el cuestionario
  existingConditions = input<QuestionCondition[]>([]);

  // Output: condición creada / actualizada / eliminada para que el padre refresque
  conditionCreated = output<QuestionCondition>();
  conditionUpdated = output<QuestionCondition>();
  conditionDeleted = output<number>(); // id de la condición eliminada

  saving     = signal(false);
  deleting   = signal<number | null>(null);
  errorMsg   = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Formulario de nueva condición
  newTriggerQuestionId = signal<number | null>(null);
  newTriggerOptionId   = signal<number | null>(null);
  newTargetQuestionId  = signal<number | null>(null);

  // Edición en sitio: id de la condición que se está editando (o null si es creación)
  editingConditionId = signal<number | null>(null);
  // Destino original de la condición en edición (para mantenerlo seleccionable)
  editingTargetId    = signal<number | null>(null);

  get isEditing(): boolean {
    return this.editingConditionId() !== null;
  }

  // Preguntas que pueden ser trigger
  // (solo las que tienen opciones y son de tipo selectable)
  triggerCandidates = computed(() =>
    this.allQuestions().filter(q =>
      ['OPCION_UNICA', 'OPCION_MULTIPLE', 'VERDADERO_FALSO', 'LIKERT']
        .includes(q.tipoPregunta) &&
      !q.isCondicional   // solo preguntas base como triggers
    )
  );

  // Opciones de la pregunta trigger seleccionada
  triggerOptions = computed<OptionResponse[]>(() => {
    const triggerId = this.newTriggerQuestionId();
    if (!triggerId) return [];
    const bankQ = this.bankQuestions().find(b => b.idPregunta === triggerId);
    return bankQ?.opcionPregunta ?? [];
  });

  // Preguntas disponibles como target
  // (las que NO son la pregunta trigger y NO tienen ya una condición con este trigger/opción)
  targetCandidates = computed(() => {
    const triggerId = this.newTriggerQuestionId();
    const optionId  = this.newTriggerOptionId();
    if (!triggerId || !optionId) return [];

    // IDs ya usados para este trigger + opción (excluyendo la condición en edición)
    const editId = this.editingConditionId();
    const usedTargets = this.existingConditions()
      .filter(c =>
        c.triggerIdPregunta === triggerId &&
        c.triggerIdOpcion   === optionId   &&
        c.id !== editId
      )
      .map(c => c.targetIdPregunta);

    const editTarget = this.editingTargetId();
    return this.allQuestions().filter(q =>
      q.idPregunta !== triggerId &&
      // base, o bien el destino original de la condición que estamos editando
      (!q.isCondicional || q.idPregunta === editTarget) &&
      !usedTargets.includes(q.idPregunta)
    );
  });

  // Condiciones agrupadas por pregunta trigger
  conditionsByTrigger = computed(() => {
    const conditions = this.existingConditions();
    const questions  = this.allQuestions();
    const bank       = this.bankQuestions();

    const map = new Map<number, {
      triggerQuestion: QuestionnaireQuestion;
      triggerOption:   OptionResponse | null;
      targetQuestion:  QuestionnaireQuestion;
      condition:       QuestionCondition;
    }[]>();

    conditions.forEach(c => {
      const tq = questions.find(q => q.idPregunta === c.triggerIdPregunta);
      const ta = questions.find(q => q.idPregunta === c.targetIdPregunta);
      const bq = bank.find(b => b.idPregunta === c.triggerIdPregunta);
      const to = bq?.opcionPregunta.find(o => o.idOpcion === c.triggerIdOpcion) ?? null;
      if (!tq || !ta) return;

      const key  = c.triggerIdPregunta;
      const item = { triggerQuestion: tq, triggerOption: to, targetQuestion: ta, condition: c };
      map.has(key) ? map.get(key)!.push(item) : map.set(key, [item]);
    });

    return [...map.entries()].map(([qId, items]) => ({
      triggerQuestionId: qId,
      triggerQuestionText: items[0].triggerQuestion.textoPregunta,
      items
    }));
  });

  ngOnChanges(): void {
    // Resetear selección si cambian las preguntas disponibles
    this.newTriggerQuestionId.set(null);
    this.newTriggerOptionId.set(null);
    this.newTargetQuestionId.set(null);
  }

  onTriggerQuestionChange(): void {
    this.newTriggerOptionId.set(null);
    this.newTargetQuestionId.set(null);
  }

  onTriggerOptionChange(): void {
    this.newTargetQuestionId.set(null);
  }

  // Despacha entre crear y actualizar según el modo
  submit(): void {
    if (this.isEditing) {
      this.updateCondition();
    } else {
      this.createCondition();
    }
  }

  // Cargar una condición existente en el formulario para editarla
  startEdit(c: QuestionCondition): void {
    this.clearMessages();
    this.editingConditionId.set(c.id);
    this.editingTargetId.set(c.targetIdPregunta);
    this.newTriggerQuestionId.set(c.triggerIdPregunta);
    this.newTriggerOptionId.set(c.triggerIdOpcion);
    this.newTargetQuestionId.set(c.targetIdPregunta);
  }

  cancelEdit(): void {
    this.editingConditionId.set(null);
    this.editingTargetId.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.newTriggerQuestionId.set(null);
    this.newTriggerOptionId.set(null);
    this.newTargetQuestionId.set(null);
  }

  createCondition(): void {
    const tqId = this.newTriggerQuestionId();
    const toId = this.newTriggerOptionId();
    const taId = this.newTargetQuestionId();

    if (!tqId || !toId || !taId) return;

    this.saving.set(true);
    this.clearMessages();

    const req: CondicionPreguntaRequest = {
      triggerIdPregunta: tqId,
      triggerIdOpcion:   toId,
      targetIdPregunta:  taId
    };

    this.svc.createCondition(this.questionnaireId(), req).subscribe({
      next: res => {
        this.saving.set(false);
        this.conditionCreated.emit(res.data);
        this.resetForm();
        this.showSuccess('Condición creada correctamente.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al crear la condición.');
      }
    });
  }

  updateCondition(): void {
    const tqId   = this.newTriggerQuestionId();
    const toId   = this.newTriggerOptionId();
    const taId   = this.newTargetQuestionId();
    const condId = this.editingConditionId();

    if (!tqId || !toId || !taId || !condId) return;

    this.saving.set(true);
    this.clearMessages();

    const req: CondicionPreguntaRequest = {
      triggerIdPregunta: tqId,
      triggerIdOpcion:   toId,
      targetIdPregunta:  taId
    };

    this.svc.updateCondition(this.questionnaireId(), condId, req).subscribe({
      next: res => {
        this.saving.set(false);
        this.conditionUpdated.emit(res.data);
        this.cancelEdit();
        this.showSuccess('Condición actualizada correctamente.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al actualizar la condición.');
      }
    });
  }

  deleteCondition(conditionId: number): void {
    this.deleting.set(conditionId);
    this.clearMessages();

    this.svc.deleteCondition(this.questionnaireId(), conditionId).subscribe({
      next: () => {
        this.deleting.set(null);
        this.conditionDeleted.emit(conditionId);
        this.showSuccess('Condición eliminada.');
      },
      error: err => {
        this.deleting.set(null);
        this.errorMsg.set(err?.error?.message ?? 'Error al eliminar.');
      }
    });
  }

  getTypeLabel(type: string): string {
    const m: Record<string, string> = {
      VERDADERO_FALSO: 'V/F',
      LIKERT:          'Likert',
      OPCION_UNICA:    'Única',
      OPCION_MULTIPLE: 'Múltiple',
      DESCRIPCION:     'Texto'
    };
    return m[type] ?? type;
  }

  getTypeClass(type: string): string {
    const m: Record<string, string> = {
      VERDADERO_FALSO: 'type-tf',
      LIKERT:          'type-lk',
      OPCION_UNICA:    'type-sc',
      OPCION_MULTIPLE: 'type-mc',
      DESCRIPCION:     'type-desc'
    };
    return m[type] ?? '';
  }

  canCreate(): boolean {
    return !!this.newTriggerQuestionId() &&
           !!this.newTriggerOptionId()   &&
           !!this.newTargetQuestionId();
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  private clearMessages(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }
}
