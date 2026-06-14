import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { QuestionForm } from '../question-form/question-form';
import { QuestionnairesService } from '../questionnaires.service';
import { PreguntaResponse } from '../../../core/models/questionnaire-admin.model';
import { DimensionsService } from '../../dimensions/dimensions.service';
import { DimensionResponse } from '../../../core/models/dimension.model';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-question-bank',
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
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
          <app-question-form (questionCreated)="onCreated()" (cancelled)="showForm.set(false)" />
        </div>
      }

      @if (errorMsg()) {
        <div class="alert-error" role="alert">{{ errorMsg() }}</div>
      }

      <!-- Filtro por tipo de pregunta -->
      <div class="bank__filter" role="group" aria-label="Filtrar por tipo de pregunta">
        @for (opt of typeOptions; track opt.value) {
          <button
            type="button"
            class="filter-chip"
            [class.active]="selectedType() === opt.value"
            (click)="onFilter(opt.value)"
          >
            {{ opt.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="bank__loading"><mat-spinner diameter="36" /></div>
      } @else if (questions().length === 0) {
        <p class="bank__empty">
          @if (selectedType()) {
            No hay preguntas de este tipo.
          } @else {
            No hay preguntas en el banco todavía.
          }
        </p>
      } @else {
        <div class="bank__list">
          @for (q of questions(); track q.idPregunta) {
            <article class="q-card">
              <div class="q-card__head">
                <span class="type-chip" [class]="getTypeClass(q.tipoPregunta)">
                  {{ getTypeLabel(q.tipoPregunta) }}
                </span>
                @if (q.dimension) {
                  <span class="dim-chip" matTooltip="Dimensión">{{ q.dimension.nombre }}</span>
                }
                <p class="q-text">{{ q.texto }}</p>
                <button
                  mat-icon-button
                  class="btn-edit"
                  (click)="startEdit(q)"
                  matTooltip="Editar dimensión y pesos"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  class="btn-del"
                  (click)="remove(q.idPregunta)"
                  matTooltip="Eliminar (solo si no está en uso)"
                >
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>

              @if (editingId() === q.idPregunta) {
                <!-- Panel de edición -->
                <div class="q-edit">
                  <label class="edit-label">Dimensión</label>
                  <select
                    class="edit-select"
                    [ngModel]="editDimId()"
                    (ngModelChange)="editDimId.set($event)"
                  >
                    <option [ngValue]="null">(Sin dimensión)</option>
                    @for (d of dimensions(); track d.id) {
                      <option [ngValue]="d.id">
                        {{ d.nombre }} · {{ d.skill === 'PENSAMIENTO_CRITICO' ? 'PC' : 'AD' }}
                      </option>
                    }
                  </select>

                  @if (q.opcionPregunta.length > 0) {
                    <label class="edit-label">Pesos de las opciones</label>
                    <ul class="edit-opts">
                      @for (opt of q.opcionPregunta; track opt.idOpcion) {
                        <li class="edit-opt">
                          <span class="edit-opt-text">{{ opt.texto }}</span>
                          <input
                            type="number"
                            min="0"
                            class="edit-weight"
                            [ngModel]="editWeights()[opt.idOpcion]"
                            (ngModelChange)="setWeight(opt.idOpcion, $event)"
                          />
                        </li>
                      }
                    </ul>
                  }

                  <div class="edit-actions">
                    <button type="button" class="btn-cancel-edit" (click)="cancelEdit()">
                      Cancelar
                    </button>
                    <button
                      mat-flat-button
                      class="btn-save-edit"
                      [disabled]="savingEdit()"
                      (click)="saveEdit(q)"
                    >
                      {{ savingEdit() ? 'Guardando…' : 'Guardar' }}
                    </button>
                  </div>
                </div>
              } @else if (q.opcionPregunta.length > 0) {
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

        <mat-paginator
          class="bank__paginator"
          [length]="totalElements()"
          [pageSize]="pageSize()"
          [pageIndex]="page()"
          [pageSizeOptions]="[5, 10, 20, 50]"
          (page)="onPage($event)"
          aria-label="Paginación del banco de preguntas"
        />
      }
    </section>
  `,
  styles: `
    .bank {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    .bank__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .bank__header h1 {
      margin: 0.25rem 0 0.25rem;
    }
    .bank__header p {
      color: var(--text-secondary);
      margin: 0;
      max-width: 48ch;
    }
    .bank__form {
      margin-bottom: 1.5rem;
    }
    .bank__filter {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 1.25rem;
    }
    .filter-chip {
      font-size: 13px;
      font-weight: 500;
      padding: 5px 14px;
      border-radius: 99px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
    }
    .filter-chip:hover {
      background: var(--bg-app);
    }
    .filter-chip.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    .bank__loading {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .bank__empty {
      color: var(--text-secondary);
    }
    .bank__list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .bank__paginator {
      margin-top: 1rem;
      background: transparent;
      border-radius: var(--radius-md);
    }
    .q-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1rem;
    }
    .q-card__head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .q-text {
      flex: 1;
      margin: 0;
      font-weight: 500;
    }
    .type-chip {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
      background: rgba(0, 0, 0, 0.06);
      white-space: nowrap;
    }
    .btn-del {
      color: var(--danger) !important;
    }
    .btn-edit {
      color: var(--primary) !important;
    }
    .q-edit {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .edit-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .edit-select {
      padding: 7px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      font: inherit;
      font-size: 13px;
      max-width: 360px;
    }
    .edit-opts {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .edit-opt {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .edit-opt-text {
      flex: 1;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .edit-weight {
      width: 80px;
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 13px;
      text-align: right;
    }
    .edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 0.25rem;
    }
    .btn-cancel-edit {
      background: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 7px 14px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-secondary);
    }
    .btn-cancel-edit:hover {
      background: var(--bg-app);
    }
    .dim-chip {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
      background: rgba(26, 92, 56, 0.12);
      color: var(--primary);
      white-space: nowrap;
    }
    .opt-list {
      list-style: none;
      margin: 0.75rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .opt-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-secondary);
      padding: 3px 6px;
      border-radius: 6px;
    }
    .opt-row.opt-correct {
      background: rgba(16, 185, 129, 0.1);
      color: #0f7a52;
      font-weight: 500;
    }
    .opt-ic {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #10b981;
    }
    .opt-ic.muted {
      color: var(--border);
    }
    .opt-text {
      flex: 1;
    }
    .opt-peso {
      font-size: 11px;
      opacity: 0.7;
    }
    .no-opts {
      color: var(--text-secondary);
      font-size: 13px;
      margin: 0.5rem 0 0;
      font-style: italic;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
      padding: 0.6rem 0.9rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
    }
  `,
})
export class QuestionBank implements OnInit {
  private svc = inject(QuestionnairesService);
  private dimSvc = inject(DimensionsService);
  private toast = inject(MessageService);

  loading = signal(true);
  questions = signal<PreguntaResponse[]>([]);
  showForm = signal(false);
  errorMsg = signal<string | null>(null);

  // Edición de dimensión + pesos (consume PATCH /dimension y /opcion_peso)
  dimensions = signal<DimensionResponse[]>([]);
  editingId = signal<number | null>(null);
  editDimId = signal<number | null>(null);
  editWeights = signal<Record<number, number>>({});
  savingEdit = signal(false);

  // Paginación
  page = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Filtro por tipo (null = todas)
  selectedType = signal<string | null>(null);
  typeOptions: { value: string | null; label: string }[] = [
    { value: null, label: 'Todas' },
    { value: 'VERDADERO_FALSO', label: 'V/F' },
    { value: 'LIKERT', label: 'Likert' },
    { value: 'OPCION_UNICA', label: 'Única' },
    { value: 'OPCION_MULTIPLE', label: 'Múltiple' },
    { value: 'DESCRIPCION', label: 'Texto' },
  ];

  ngOnInit(): void {
    this.load();
    this.dimSvc.list().subscribe((d) => this.dimensions.set(d));
  }

  // ── Edición de dimensión y pesos ───────────────────────────
  startEdit(q: PreguntaResponse): void {
    this.errorMsg.set(null);
    this.editingId.set(q.idPregunta);
    this.editDimId.set(q.dimension?.id ?? null);
    const w: Record<number, number> = {};
    for (const o of q.opcionPregunta) w[o.idOpcion] = o.peso;
    this.editWeights.set(w);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  setWeight(idOpcion: number, value: number): void {
    this.editWeights.update((w) => ({ ...w, [idOpcion]: Number(value) }));
  }

  saveEdit(q: PreguntaResponse): void {
    this.errorMsg.set(null);

    const calls = [];
    // ¿cambió la dimensión?
    const newDim = this.editDimId();
    const oldDim = q.dimension?.id ?? null;
    if (newDim !== oldDim) {
      calls.push(this.svc.assignDimension(q.idPregunta, newDim));
    }
    // ¿cambió algún peso?
    const w = this.editWeights();
    const pesosCambiaron = q.opcionPregunta.some((o) => w[o.idOpcion] !== o.peso);
    if (pesosCambiaron) {
      calls.push(this.svc.updateOptionWeights(q.idPregunta, w));
    }

    if (calls.length === 0) {
      this.editingId.set(null);
      return;
    }

    this.savingEdit.set(true);
    forkJoin(calls).subscribe({
      next: (results) => {
        const updated = results[results.length - 1].data;
        if (updated) {
          this.questions.update((list) =>
            list.map((x) => (x.idPregunta === q.idPregunta ? updated : x)),
          );
        }
        this.editingId.set(null);
        this.savingEdit.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Pregunta actualizada',
          detail: 'Los cambios se guardaron correctamente.',
          life: 3000,
        });
      },
      error: (err) => {
        this.savingEdit.set(false);
        this.errorMsg.set(err?.error?.message ?? 'No se pudieron guardar los cambios.');
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo actualizar',
          detail: err?.error?.message ?? 'Ocurrió un error al guardar los cambios.',
          life: 4000,
        });
      },
    });
  }

  /** Cambia el filtro por tipo y recarga desde la primera página. */
  onFilter(type: string | null): void {
    if (type === this.selectedType()) return;
    this.selectedType.set(type);
    this.page.set(0);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getQuestionsPaged(this.page(), this.pageSize(), this.selectedType()).subscribe({
      next: (res) => {
        const data = res.data;
        this.questions.set(data?.content ?? []);
        this.totalElements.set(data?.totalElements ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  onCreated(): void {
    this.showForm.set(false);
    // Las nuevas aparecen primero (orden id desc) → volver a la página 1.
    this.page.set(0);
    this.load();
  }

  remove(id: number): void {
    this.errorMsg.set(null);
    this.svc.deleteQuestion(id).subscribe({
      next: () => {
        // Si era la última de la página actual, retroceder una página.
        if (this.questions().length === 1 && this.page() > 0) {
          this.page.update((p) => p - 1);
        }
        this.load();
      },
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
