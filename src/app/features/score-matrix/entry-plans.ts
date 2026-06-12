import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScoreMatrixService } from './score-matrix.service';
import {
  PLAN_AXIS_OPTIONS,
  PlanAxis,
  PlanFortalecimientoResponse,
  TIPO_ACCION_OPTIONS,
  TipoAccion,
} from '../../core/models/plan-fortalecimiento.model';

@Component({
  selector: 'app-entry-plans',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plans">
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="22" /></div>
      } @else {
        @if (plans().length === 0) {
          <p class="empty">Sin planes de fortalecimiento configurados (máx. 3, uno por eje).</p>
        } @else {
          <div class="plan-cards">
            @for (p of plans(); track p.id) {
              <div class="plan-card axis-{{ p.planAxis.toLowerCase() }}">
                <div class="plan-head">
                  <span class="axis-chip">{{ axisLabel(p.planAxis) }}</span>
                  <span class="accion-chip">{{ accionLabel(p.tipoAccion) }}</span>
                  <div class="plan-actions">
                    <button mat-icon-button (click)="startEdit(p)" matTooltip="Editar">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button class="del" (click)="remove(p)" matTooltip="Eliminar">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
                <p class="plan-title">{{ p.titulo }}</p>
                <p class="plan-desc">{{ p.descripcion }}</p>
                @if (p.recursos.length) {
                  <ul class="recursos">
                    @for (r of p.recursos; track r) {
                      <li>{{ r }}</li>
                    }
                  </ul>
                }
              </div>
            }
          </div>
        }

        <!-- Formulario crear/editar plan -->
        @if (availableAxes().length > 0 || editingId()) {
          <div class="plan-form">
            <h4>{{ editingId() ? 'Editar plan' : 'Agregar plan' }}</h4>
            <div class="pf-grid">
              <mat-form-field appearance="outline">
                <mat-label>Eje</mat-label>
                <mat-select [(ngModel)]="fAxis" [disabled]="!!editingId()">
                  @for (a of editingId() ? axes : availableAxes(); track a.value) {
                    <mat-option [value]="a.value">{{ a.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo de acción</mat-label>
                <mat-select [(ngModel)]="fTipo">
                  @for (t of tipos; track t.value) {
                    <mat-option [value]="t.value">{{ t.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Título</mat-label>
                <input matInput [(ngModel)]="fTitulo" maxlength="200" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Descripción</mat-label>
                <textarea matInput [(ngModel)]="fDescripcion" rows="2" maxlength="2000"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Recursos (uno por línea, máx. 10)</mat-label>
                <textarea
                  matInput
                  [(ngModel)]="fRecursos"
                  rows="2"
                  placeholder="https://...
otro recurso"
                ></textarea>
              </mat-form-field>
            </div>
            <div class="pf-actions">
              @if (editingId()) {
                <button mat-stroked-button (click)="cancelEdit()">Cancelar</button>
              }
              <button
                mat-flat-button
                class="btn-save"
                [disabled]="!canSave() || saving()"
                (click)="save()"
              >
                {{ editingId() ? 'Guardar plan' : 'Agregar plan' }}
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .plans {
      padding: 0.5rem 0.25rem;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 0.5rem;
    }
    .empty {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin: 0 0 0.5rem;
    }
    .plan-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .plan-card {
      border: 1px solid var(--border);
      border-left: 3px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.75rem;
      background: var(--bg-card);
    }
    .plan-card.axis-academico {
      border-left-color: #2563eb;
    }
    .plan-card.axis-experimental {
      border-left-color: #c8a84b;
    }
    .plan-card.axis-personal {
      border-left-color: #0f7a52;
    }
    .plan-head {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .axis-chip,
    .accion-chip {
      font-size: 10.5px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 99px;
      background: rgba(0, 0, 0, 0.06);
    }
    .plan-actions {
      margin-left: auto;
      display: flex;
    }
    .plan-actions .del {
      color: var(--danger) !important;
    }
    .plan-title {
      font-weight: 600;
      margin: 0.4rem 0 0.1rem;
      font-size: 0.9rem;
    }
    .plan-desc {
      color: var(--text-secondary);
      font-size: 0.82rem;
      margin: 0;
    }
    .recursos {
      margin: 0.4rem 0 0;
      padding-left: 1rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .plan-form {
      border-top: 1px dashed var(--border);
      padding-top: 0.6rem;
    }
    .plan-form h4 {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
    }
    .pf-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem 0.6rem;
    }
    .pf-grid .full {
      grid-column: 1 / -1;
    }
    .pf-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class EntryPlans implements OnInit {
  private svc = inject(ScoreMatrixService);
  private snack = inject(MatSnackBar);

  matrixId = input.required<number>();

  axes = PLAN_AXIS_OPTIONS;
  tipos = TIPO_ACCION_OPTIONS;

  loading = signal(true);
  saving = signal(false);
  plans = signal<PlanFortalecimientoResponse[]>([]);
  editingId = signal<number | null>(null);

  fAxis: PlanAxis = 'ACADEMICO';
  fTipo: TipoAccion = 'LEER';
  fTitulo = '';
  fDescripcion = '';
  fRecursos = '';

  availableAxes = computed(() => {
    const used = new Set(this.plans().map((p) => p.planAxis));
    return this.axes.filter((a) => !used.has(a.value));
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.listPlans(this.matrixId()).subscribe({
      next: (p) => {
        this.plans.set(p);
        this.loading.set(false);
        const avail = this.availableAxes();
        if (avail.length > 0 && !this.editingId()) this.fAxis = avail[0].value;
      },
      error: () => this.loading.set(false),
    });
  }

  canSave(): boolean {
    return this.fTitulo.trim().length > 0 && this.fDescripcion.trim().length > 0;
  }

  private parseRecursos(): string[] {
    return this.fRecursos
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .slice(0, 10);
  }

  save(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    const editId = this.editingId();
    const recursos = this.parseRecursos();

    const op = editId
      ? this.svc.updatePlan(this.matrixId(), editId, {
          titulo: this.fTitulo.trim(),
          descripcion: this.fDescripcion.trim(),
          tipoAccion: this.fTipo,
          recursos,
        })
      : this.svc.createPlan(this.matrixId(), {
          planAxis: this.fAxis,
          titulo: this.fTitulo.trim(),
          descripcion: this.fDescripcion.trim(),
          tipoAccion: this.fTipo,
          recursos,
        });

    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(editId ? 'Plan actualizado.' : 'Plan agregado.', 'Cerrar', {
          duration: 2000,
        });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Error al guardar el plan.', 'Cerrar', {
          duration: 4000,
        });
      },
    });
  }

  startEdit(p: PlanFortalecimientoResponse): void {
    this.editingId.set(p.id);
    this.fAxis = p.planAxis;
    this.fTipo = p.tipoAccion;
    this.fTitulo = p.titulo;
    this.fDescripcion = p.descripcion;
    this.fRecursos = (p.recursos ?? []).join('\n');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.fTitulo = '';
    this.fDescripcion = '';
    this.fRecursos = '';
    const avail = this.availableAxes();
    if (avail.length > 0) this.fAxis = avail[0].value;
  }

  remove(p: PlanFortalecimientoResponse): void {
    this.svc.removePlan(this.matrixId(), p.id).subscribe({
      next: () => {
        this.snack.open('Plan eliminado.', 'Cerrar', { duration: 2000 });
        this.load();
      },
      error: (err) =>
        this.snack.open(err?.error?.message ?? 'No se pudo eliminar.', 'Cerrar', {
          duration: 4000,
        }),
    });
  }

  axisLabel(a: PlanAxis): string {
    return this.axes.find((x) => x.value === a)?.label ?? a;
  }
  accionLabel(t: TipoAccion): string {
    return this.tipos.find((x) => x.value === t)?.label ?? t;
  }
}
