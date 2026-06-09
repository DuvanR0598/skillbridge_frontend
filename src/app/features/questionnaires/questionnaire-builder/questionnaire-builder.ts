import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { QuestionForm } from '../question-form/question-form';
import { QuestionnairesService } from '../questionnaires.service';
import {
  CuestionarioResponse,
  PreguntaResponse,
  PreguntaDeCuestionarioResponse,
} from '../../../core/models/questionnaire-admin.model';
import { catchError, forkJoin, of } from 'rxjs';


@Component({
  selector: 'app-questionnaire-builder',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule,
    MatTabsModule, QuestionForm,
  ],
  templateUrl: './questionnaire-builder.html',
  styleUrl: './questionnaire-builder.scss',
})
export class QuestionnaireBuilder implements OnInit {

  private route = inject(ActivatedRoute);
  private svc   = inject(QuestionnairesService);

  loading          = signal(true);
  saving           = signal(false);
  errorMsg         = signal<string | null>(null);
  successMsg       = signal<string | null>(null);

  questionnaire    = signal<CuestionarioResponse | null>(null);
  bankQuestions    = signal<PreguntaResponse[]>([]);
  questionnaireQuestions = signal<PreguntaDeCuestionarioResponse[]>([]);

  showNewQuestionForm = signal(false);
  questionnaireId     = 0;

  // IDs de preguntas ya dentro del cuestionario (derivado del backend)
  addedQuestionIds = computed(
    () => new Set(this.questionnaireQuestions().map(q => q.idPregunta)),
  );

  // Preguntas del banco no agregadas aún
  availableBank = computed(() => {
    const added = this.addedQuestionIds();
    return this.bankQuestions().filter(q => !added.has(q.idPregunta));
  });

  ngOnInit(): void {
    this.questionnaireId = Number(
      this.route.snapshot.paramMap.get('id')
    );
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      q: this.svc.getById(this.questionnaireId)
           .pipe(catchError(() => of({ data: null }))),
      bank: this.svc.getAllQuestions()
              .pipe(catchError(() => of({ data: [] }))),
      questions: this.svc.getQuestionnaireQuestions(this.questionnaireId)
              .pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ q, bank, questions }) => {
        this.questionnaire.set(q.data);
        this.bankQuestions.set(bank.data ?? []);
        this.questionnaireQuestions.set(questions.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Agregar pregunta del banco al cuestionario
  addFromBank(questionId: number): void {
    this.saving.set(true);
    this.clearMessages();

    this.svc.addQuestion(this.questionnaireId, {
      idpregunta: questionId,
      obligatoria: true,
      peso:    1
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showSuccess('Pregunta agregada al cuestionario.');
        this.refreshAll();
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al agregar la pregunta.');
      }
    });
  }

  // Quitar pregunta del cuestionario
  removeQuestion(questionId: number): void {
    this.saving.set(true);
    this.clearMessages();

    this.svc.removeQuestion(this.questionnaireId, questionId).subscribe({
      next: () => {
        this.saving.set(false);
        this.showSuccess('Pregunta removida del cuestionario.');
        this.refreshAll();
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al quitar la pregunta.');
      }
    });
  }

  // Pregunta creada desde el formulario → agregarla automáticamente
  onQuestionCreated(question: PreguntaResponse): void {
    // Agregar al banco local
    this.bankQuestions.update(list => [question, ...list]);
    this.showNewQuestionForm.set(false);

    // Agregar al cuestionario
    this.addFromBank(question.idPregunta);
  }

  // Refrescar cuestionario (contador + estado) y sus preguntas
  private refreshAll(): void {
    forkJoin({
      q: this.svc.getById(this.questionnaireId)
           .pipe(catchError(() => of({ data: null }))),
      questions: this.svc.getQuestionnaireQuestions(this.questionnaireId)
           .pipe(catchError(() => of({ data: [] }))),
    }).subscribe(({ q, questions }) => {
      if (q.data) this.questionnaire.set(q.data);
      this.questionnaireQuestions.set(questions.data ?? []);
    });
  }

  // Completar el cuestionario
  complete(): void {
    this.saving.set(true);
    this.clearMessages();

    this.svc.complete(this.questionnaireId).subscribe({
      next: res => {
        this.saving.set(false);
        this.questionnaire.set(res.data);
        this.showSuccess('Cuestionario marcado como COMPLETE.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al completar.');
      }
    });
  }

  isAdded(id: number): boolean {
    return this.addedQuestionIds().has(id);
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
      OPCION_UNICA:   'type-sc',
      OPCION_MULTIPLE: 'type-mc',
      DESCRIPCION:     'type-desc'
    };
    return m[type] ?? '';
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
