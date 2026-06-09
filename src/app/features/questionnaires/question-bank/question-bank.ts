import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { QuestionForm } from '../question-form/question-form';
import { QuestionnairesService } from '../questionnaires.service';
import { PreguntaResponse } from '../../../core/models/questionnaire-admin.model';

@Component({
  selector: 'app-question-bank',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    QuestionForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bank">
      <header class="bank__header">
        <div>
          <a mat-icon-button routerLink="/app/questionnaires" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <h1>Banco de preguntas</h1>
          <p>Preguntas reutilizables y sus opciones (con la respuesta correcta y el peso).</p>
        </div>
        <button mat-flat-button class="btn-new" (click)="showForm.set(!showForm())">
          <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon>
          {{ showForm() ? 'Cancelar' : 'Nueva pregunta' }}
        </button>
      </header>

      @if (showForm()) {
        <div class="bank__form">
          <app-question-form
            (questionCreated)="onCreated($event)"
            (cancelled)="showForm.set(false)"
          />
        </div>
      }

      @if (errorMsg()) {
        <div class="alert-error" role="alert">{{ errorMsg() }}</div>
      }

      @if (loading()) {
        <div class="bank__loading"><mat-spinner diameter="36" /></div>
      } @else if (questions().length === 0) {
        <p class="bank__empty">No hay preguntas en el banco todavía.</p>
      } @else {
        <div class="bank__list">
          @for (q of questions(); track q.idPregunta) {
            <article class="q-card">
              <div class="q-card__head">
                <span class="type-chip" [class]="getTypeClass(q.tipoPregunta)">
                  {{ getTypeLabel(q.tipoPregunta) }}
                </span>
                <p class="q-text">{{ q.texto }}</p>
                <button
                  mat-icon-button
                  class="btn-del"
                  (click)="remove(q.idPregunta)"
                  matTooltip="Eliminar (solo si no está en uso)"
                >
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>

              @if (q.opcionPregunta.length > 0) {
                <ul class="opt-list">
                  @for (opt of q.opcionPregunta; track opt.idOpcion) {
                    <li class="opt-row" [class.opt-correct]="opt.isCorrecta">
                      <mat-icon class="opt-ic" [class.muted]="!opt.isCorrecta">
                        {{ opt.isCorrecta ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                      <span class="opt-text">{{ opt.texto }}</span>
                      <span class="opt-peso">peso {{ opt.peso }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="no-opts">Pregunta abierta (sin opciones).</p>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .bank { max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; }
    .bank__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    .bank__header h1 { margin: 0.25rem 0 0.25rem; }
    .bank__header p { color: var(--text-secondary); margin: 0; max-width: 48ch; }
    .bank__form { margin-bottom: 1.5rem; }
    .bank__loading { display: flex; justify-content: center; padding: 3rem 0; }
    .bank__empty { color: var(--text-secondary); }
    .bank__list { display: flex; flex-direction: column; gap: 0.75rem; }
    .q-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; }
    .q-card__head { display: flex; align-items: center; gap: 0.6rem; }
    .q-text { flex: 1; margin: 0; font-weight: 500; }
    .type-chip { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: rgba(0,0,0,0.06); white-space: nowrap; }
    .btn-del { color: var(--danger) !important; }
    .opt-list { list-style: none; margin: 0.75rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .opt-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); padding: 3px 6px; border-radius: 6px; }
    .opt-row.opt-correct { background: rgba(16,185,129,0.1); color: #0f7a52; font-weight: 500; }
    .opt-ic { font-size: 17px; width: 17px; height: 17px; color: #10b981; }
    .opt-ic.muted { color: var(--border); }
    .opt-text { flex: 1; }
    .opt-peso { font-size: 11px; opacity: 0.7; }
    .no-opts { color: var(--text-secondary); font-size: 13px; margin: 0.5rem 0 0; font-style: italic; }
    .alert-error { background: rgba(239,68,68,0.1); color: var(--danger); padding: 0.6rem 0.9rem; border-radius: var(--radius-sm); margin-bottom: 1rem; }
  `,
})
export class QuestionBank implements OnInit {
  private svc = inject(QuestionnairesService);

  loading = signal(true);
  questions = signal<PreguntaResponse[]>([]);
  showForm = signal(false);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getAllQuestions().subscribe({
      next: (res) => {
        this.questions.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onCreated(q: PreguntaResponse): void {
    this.questions.update((list) => [q, ...list]);
    this.showForm.set(false);
  }

  remove(id: number): void {
    this.errorMsg.set(null);
    this.svc.deleteQuestion(id).subscribe({
      next: () => this.questions.update((list) => list.filter((q) => q.idPregunta !== id)),
      error: (err) =>
        this.errorMsg.set(
          err?.error?.message ?? 'No se pudo eliminar (puede estar en uso en un cuestionario).',
        ),
    });
  }

  getTypeLabel(type: string): string {
    const m: Record<string, string> = {
      VERDADERO_FALSO: 'V/F',
      LIKERT: 'Likert',
      OPCION_UNICA: 'Única',
      OPCION_MULTIPLE: 'Múltiple',
      DESCRIPCION: 'Texto',
    };
    return m[type] ?? type;
  }

  getTypeClass(type: string): string {
    const m: Record<string, string> = {
      VERDADERO_FALSO: 'type-tf',
      LIKERT: 'type-lk',
      OPCION_UNICA: 'type-sc',
      OPCION_MULTIPLE: 'type-mc',
      DESCRIPCION: 'type-desc',
    };
    return m[type] ?? '';
  }
}
