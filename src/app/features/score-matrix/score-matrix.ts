import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScoreMatrixService } from './score-matrix.service';
import { EntryPlans } from './entry-plans';
import { DimensionsService } from '../dimensions/dimensions.service';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';
import { DimensionResponse, SKILL_OPTIONS, SkillTipo } from '../../core/models/dimension.model';
import {
  BLOOM_OPTIONS,
  NIVEL_OPTIONS,
  NivelBloom,
  PuntuacionMatrixResponse,
  SkillNivel,
} from '../../core/models/score-matrix.model';
import { CuestionarioResponse } from '../../core/models/questionnaire-admin.model';

@Component({
  selector: 'app-score-matrix',
  imports: [
    SlicePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    EntryPlans,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sm">
      <header class="sm__header">
        <h1>Matriz de puntuación</h1>
        <p>
          Define, por nivel, el rango de puntaje, la dimensión y los descriptores de cada
          competencia.
        </p>
      </header>

      <!-- Selector de cuestionario -->
      <mat-form-field appearance="outline" class="q-select">
        <mat-label>Cuestionario (Completo o Publicado)</mat-label>
        <mat-select [(ngModel)]="selectedQId" (selectionChange)="onSelectQuestionnaire()">
          @for (q of questionnaires(); track q.idCuestionario) {
            <mat-option [value]="q.idCuestionario">
              {{ q.nombre }} · {{ q.estadoCuestionario }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (!selectedQId()) {
        <p class="hint">Selecciona un cuestionario para configurar su matriz.</p>
      } @else {
        <!-- Formulario -->
        <div class="sm__form">
          <h3>{{ editingId() ? 'Editar entrada' : 'Nueva entrada de matriz' }}</h3>
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>Competencia</mat-label>
              <mat-select
                [(ngModel)]="fSkill"
                [disabled]="!!editingId()"
                (selectionChange)="fIdDimension = null"
              >
                @for (s of skills; track s.value) {
                  <mat-option [value]="s.value">{{ s.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Dimensión (opcional)</mat-label>
              <mat-select [(ngModel)]="fIdDimension" [disabled]="!!editingId()">
                <mat-option [value]="null">Global (sin dimensión)</mat-option>
                @for (d of dimsForSkill(); track d.id) {
                  <mat-option [value]="d.id">{{ d.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Nivel</mat-label>
              <mat-select [(ngModel)]="fNivel" [disabled]="!!editingId()">
                @for (n of niveles; track n.value) {
                  <mat-option [value]="n.value">{{ n.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Pregunta (opcional)</mat-label>
              <mat-select [(ngModel)]="fIdPregunta" [disabled]="!!editingId()">
                <mat-option [value]="null">Todas (global del skill)</mat-option>
                @for (p of questions(); track p.idPregunta) {
                  <mat-option [value]="p.idPregunta">{{ p.texto | slice: 0 : 50 }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Puntaje mínimo</mat-label>
              <input matInput type="number" [(ngModel)]="fMin" min="0" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Puntaje máximo</mat-label>
              <input matInput type="number" [(ngModel)]="fMax" min="1" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Descripción del nivel</mat-label>
              <input
                matInput
                [(ngModel)]="fDescripcion"
                placeholder="Qué puede hacer el estudiante en este nivel"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Características observables</mat-label>
              <input
                matInput
                [(ngModel)]="fCaracteristicas"
                placeholder="Comportamientos observables"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full">
              <mat-label>Niveles de Bloom</mat-label>
              <mat-select [(ngModel)]="fBloom" multiple>
                @for (b of blooms; track b) {
                  <mat-option [value]="b">{{ b }}</mat-option>
                }
              </mat-select>
              <mat-hint
                >Si lo dejas vacío, el backend asigna los de Bloom por defecto según el
                nivel.</mat-hint
              >
            </mat-form-field>
          </div>

          <div class="actions">
            @if (editingId()) {
              <button mat-stroked-button (click)="cancelEdit()">Cancelar</button>
            }
            <button
              mat-flat-button
              class="btn-save"
              [disabled]="!canSave() || saving()"
              (click)="save()"
            >
              <mat-icon>{{ editingId() ? 'save' : 'add' }}</mat-icon>
              {{ editingId() ? 'Guardar cambios' : 'Agregar entrada' }}
            </button>
          </div>
        </div>

        @if (loading()) {
          <div class="sm__loading"><mat-spinner diameter="32" /></div>
        } @else if (entries().length === 0) {
          <p class="hint">Aún no hay entradas en la matriz de este cuestionario.</p>
        } @else {
          @for (group of grouped(); track group.key) {
            <div class="grp">
              <h2 class="grp-title">
                {{ skillLabel(group.skill) }}
                @if (group.dimensionNombre) {
                  · {{ group.dimensionNombre }}
                } @else {
                  · Global
                }
              </h2>
              <ul class="entries">
                @for (e of group.items; track e.id) {
                  <li class="entry">
                    <div class="entry-row">
                      <span class="nivel-chip nivel-{{ e.nivel.toLowerCase() }}">{{
                        nivelLabel(e.nivel)
                      }}</span>
                      <span class="range">{{ e.minPuntaje }}–{{ e.maxPuntaje }} pts</span>
                      <span class="desc">{{ e.descripcion || '—' }}</span>
                      @if (e.idPregunta) {
                        <span class="pq-chip" matTooltip="Aplica a una pregunta específica"
                          >P#{{ e.idPregunta }}</span
                        >
                      }
                      <div class="entry-actions">
                        <button
                          mat-button
                          class="btn-plans"
                          [class.active]="expandedEntryId() === e.id"
                          (click)="togglePlans(e.id)"
                        >
                          <mat-icon>fitness_center</mat-icon>
                          Planes
                        </button>
                        <button
                          mat-icon-button
                          (click)="startEdit(e)"
                          matTooltip="Editar rango/descriptores"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button class="del" (click)="remove(e)" matTooltip="Eliminar">
                          <mat-icon>delete_outline</mat-icon>
                        </button>
                      </div>
                    </div>
                    @if (expandedEntryId() === e.id) {
                      <app-entry-plans [matrixId]="e.id" />
                    }
                  </li>
                }
              </ul>
            </div>
          }
        }
      }
    </section>
  `,
  styles: `
    .sm {
      max-width: 960px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    .sm__header h1 {
      margin: 0 0 0.25rem;
    }
    .sm__header p {
      color: var(--text-secondary);
      margin: 0 0 1.25rem;
    }
    .q-select {
      width: 100%;
      max-width: 520px;
    }
    .hint {
      color: var(--text-secondary);
    }
    .sm__form {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      margin: 0.5rem 0 1.5rem;
    }
    .sm__form h3 {
      margin: 0 0 0.75rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem 0.75rem;
    }
    .grid .full {
      grid-column: 1 / -1;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .sm__loading {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
    }
    .grp {
      margin-bottom: 1.25rem;
    }
    .grp-title {
      font-size: 0.95rem;
      color: var(--primary);
      border-bottom: 2px solid var(--primary);
      padding-bottom: 4px;
      margin-bottom: 0.5rem;
    }
    .entries {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .entry {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.8rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    .entry-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .btn-plans.active {
      background: rgba(26, 92, 56, 0.12);
    }
    .nivel-chip {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
    }
    .nivel-bajo {
      background: rgba(239, 68, 68, 0.12);
      color: var(--danger);
    }
    .nivel-intermedio {
      background: rgba(200, 168, 75, 0.18);
      color: #8a6d1f;
    }
    .nivel-avanzado {
      background: rgba(16, 185, 129, 0.12);
      color: #0f7a52;
    }
    .range {
      font-weight: 600;
      white-space: nowrap;
    }
    .desc {
      flex: 1;
      color: var(--text-secondary);
      font-size: 0.85rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pq-chip {
      font-size: 10.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 99px;
      background: rgba(0, 0, 0, 0.06);
    }
    .entry-actions .del {
      color: var(--danger) !important;
    }
  `,
})
export class ScoreMatrix implements OnInit {
  private svc = inject(ScoreMatrixService);
  private dimSvc = inject(DimensionsService);
  private qSvc = inject(QuestionnairesService);
  private snack = inject(MatSnackBar);

  skills = SKILL_OPTIONS;
  niveles = NIVEL_OPTIONS;
  blooms = BLOOM_OPTIONS;

  loading = signal(false);
  saving = signal(false);
  questionnaires = signal<CuestionarioResponse[]>([]);
  entries = signal<PuntuacionMatrixResponse[]>([]);
  dimensions = signal<DimensionResponse[]>([]);
  questions = signal<{ idPregunta: number; texto: string }[]>([]);

  selectedQId = signal<number | null>(null);
  editingId = signal<number | null>(null);
  expandedEntryId = signal<number | null>(null);

  togglePlans(id: number): void {
    this.expandedEntryId.update((cur) => (cur === id ? null : id));
  }

  // Form
  fSkill: SkillTipo = 'PENSAMIENTO_CRITICO';
  fIdDimension: number | null = null;
  fNivel: SkillNivel = 'BAJO';
  fIdPregunta: number | null = null;
  fMin: number | null = null;
  fMax: number | null = null;
  fDescripcion = '';
  fCaracteristicas = '';
  fBloom: NivelBloom[] = [];

  grouped = computed(() => {
    const map = new Map<
      string,
      {
        key: string;
        skill: SkillTipo;
        dimensionNombre: string | null;
        items: PuntuacionMatrixResponse[];
      }
    >();
    for (const e of this.entries()) {
      const key = e.skill + '|' + (e.idDimension ?? 'GLOBAL');
      if (!map.has(key)) {
        map.set(key, {
          key,
          skill: e.skill,
          dimensionNombre: e.dimensionNombre ?? null,
          items: [],
        });
      }
      map.get(key)!.items.push(e);
    }
    return [...map.values()];
  });

  ngOnInit(): void {
    this.dimSvc.list().subscribe((d) => this.dimensions.set(d));
    this.qSvc.getAll().subscribe((res) => {
      const editables = (res.data ?? []).filter(
        (q) => q.estadoCuestionario === 'COMPLETO' || q.estadoCuestionario === 'PUBLICADO',
      );
      this.questionnaires.set(editables);
    });
  }

  onSelectQuestionnaire(): void {
    const id = this.selectedQId();
    if (!id) return;
    this.cancelEdit();
    this.loadEntries();
    this.qSvc
      .getQuestionnaireQuestions(id)
      .subscribe((res) =>
        this.questions.set(
          (res.data ?? []).map((p) => ({ idPregunta: p.idPregunta, texto: p.texto })),
        ),
      );
  }

  private loadEntries(): void {
    const id = this.selectedQId();
    if (!id) return;
    this.loading.set(true);
    this.svc.list(id).subscribe({
      next: (e) => {
        this.entries.set(e);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  dimsForSkill(): DimensionResponse[] {
    return this.dimensions().filter((d) => d.skill === this.fSkill);
  }

  canSave(): boolean {
    return this.fMin != null && this.fMax != null && this.fMin < this.fMax;
  }

  save(): void {
    const qid = this.selectedQId();
    if (!qid || !this.canSave()) return;
    this.saving.set(true);
    const editId = this.editingId();

    const op = editId
      ? this.svc.update(qid, editId, {
          minPuntaje: this.fMin!,
          maxPuntaje: this.fMax!,
          descripcion: this.fDescripcion.trim() || undefined,
          caracteristicasObservables: this.fCaracteristicas.trim() || undefined,
          nivelesBloom: this.fBloom.length ? this.fBloom : undefined,
        })
      : this.svc.create(qid, {
          skill: this.fSkill,
          idDimension: this.fIdDimension ?? undefined,
          nivel: this.fNivel,
          idPregunta: this.fIdPregunta ?? undefined,
          minPuntaje: this.fMin!,
          maxPuntaje: this.fMax!,
          descripcion: this.fDescripcion.trim() || undefined,
          caracteristicasObservables: this.fCaracteristicas.trim() || undefined,
          nivelBloom: this.fBloom.length ? this.fBloom : undefined,
        });

    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(editId ? 'Entrada actualizada.' : 'Entrada creada.', 'Cerrar', {
          duration: 2500,
        });
        this.cancelEdit();
        this.loadEntries();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Error al guardar.', 'Cerrar', { duration: 4500 });
      },
    });
  }

  startEdit(e: PuntuacionMatrixResponse): void {
    this.editingId.set(e.id);
    this.fSkill = e.skill;
    this.fIdDimension = e.idDimension ?? null;
    this.fNivel = e.nivel;
    this.fIdPregunta = e.idPregunta ?? null;
    this.fMin = e.minPuntaje;
    this.fMax = e.maxPuntaje;
    this.fDescripcion = e.descripcion ?? '';
    this.fCaracteristicas = e.caracteristicasObservables ?? '';
    this.fBloom = [...(e.nivelesBloom ?? [])];
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.fIdDimension = null;
    this.fIdPregunta = null;
    this.fMin = null;
    this.fMax = null;
    this.fDescripcion = '';
    this.fCaracteristicas = '';
    this.fBloom = [];
  }

  remove(e: PuntuacionMatrixResponse): void {
    const qid = this.selectedQId();
    if (!qid) return;
    this.svc.remove(qid, e.id).subscribe({
      next: () => {
        this.snack.open('Entrada eliminada.', 'Cerrar', { duration: 2500 });
        this.loadEntries();
      },
      error: (err) =>
        this.snack.open(err?.error?.message ?? 'No se pudo eliminar.', 'Cerrar', {
          duration: 4000,
        }),
    });
  }

  skillLabel(s: SkillTipo): string {
    return this.skills.find((x) => x.value === s)?.label ?? s;
  }
  nivelLabel(n: SkillNivel): string {
    return this.niveles.find((x) => x.value === n)?.label ?? n;
  }
}
