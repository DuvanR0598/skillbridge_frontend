import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DimensionsService } from './dimensions.service';
import { DimensionResponse, SKILL_OPTIONS, SkillTipo } from '../../core/models/dimension.model';

@Component({
  selector: 'app-dimensions',
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
    <section class="dims">
      <header class="dims__header">
        <h1>Dimensiones por competencia</h1>
        <p>Define las dimensiones que evalúa cada Power Skill.</p>
      </header>

      <!-- Formulario crear/editar -->
      <div class="dims__form">
        <h3>{{ editingId() ? 'Editar dimensión' : 'Nueva dimensión' }}</h3>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Competencia (Skill)</mat-label>
            <mat-select [(ngModel)]="fSkill">
              @for (s of skills; track s.value) {
                <mat-option [value]="s.value">{{ s.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nombre de la dimensión</mat-label>
            <input matInput [(ngModel)]="fNombre" placeholder="Ej: Interpretación" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Descripción (opcional)</mat-label>
            <input matInput [(ngModel)]="fDescripcion" placeholder="Qué evalúa esta dimensión" />
          </mat-form-field>
        </div>

        <div class="form-actions">
          @if (editingId()) {
            <button mat-stroked-button (click)="cancelEdit()">Cancelar</button>
          }
          <button mat-flat-button class="btn-save" [disabled]="!canSave() || saving()" (click)="save()">
            <mat-icon>{{ editingId() ? 'save' : 'add' }}</mat-icon>
            {{ editingId() ? 'Guardar' : 'Agregar dimensión' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="dims__loading"><mat-spinner diameter="32" /></div>
      } @else {
        @for (group of grouped(); track group.skill) {
          <div class="skill-group">
            <h2 class="skill-title">{{ skillLabel(group.skill) }}</h2>
            @if (group.items.length === 0) {
              <p class="empty">Sin dimensiones para esta competencia.</p>
            } @else {
              <ul class="dim-list">
                @for (d of group.items; track d.id) {
                  <li class="dim-item">
                    <div class="dim-info">
                      <span class="dim-name">{{ d.nombre }}</span>
                      @if (d.descripcion) { <span class="dim-desc">{{ d.descripcion }}</span> }
                    </div>
                    <div class="dim-actions">
                      <button mat-icon-button (click)="startEdit(d)" matTooltip="Editar">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button class="del" (click)="remove(d)" matTooltip="Eliminar">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .dims { max-width: 820px; margin: 2rem auto; padding: 0 1.5rem; }
    .dims__header h1 { margin: 0 0 0.25rem; }
    .dims__header p { color: var(--text-secondary); margin: 0 0 1.5rem; }
    .dims__form { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem; }
    .dims__form h3 { margin: 0 0 0.75rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-grid .full { grid-column: 1 / -1; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    .dims__loading { display: flex; justify-content: center; padding: 2rem 0; }
    .skill-group { margin-bottom: 1.5rem; }
    .skill-title { font-size: 1rem; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 0.75rem; }
    .empty { color: var(--text-secondary); font-size: 0.9rem; }
    .dim-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .dim-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0.9rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); }
    .dim-info { display: flex; flex-direction: column; }
    .dim-name { font-weight: 500; }
    .dim-desc { font-size: 0.82rem; color: var(--text-secondary); }
    .dim-actions .del { color: var(--danger) !important; }
  `,
})
export class Dimensions implements OnInit {
  private svc = inject(DimensionsService);
  private snack = inject(MatSnackBar);

  skills = SKILL_OPTIONS;

  loading = signal(true);
  saving = signal(false);
  dimensions = signal<DimensionResponse[]>([]);

  // Formulario (model-driven simple con ngModel)
  fSkill: SkillTipo = 'PENSAMIENTO_CRITICO';
  fNombre = '';
  fDescripcion = '';
  editingId = signal<number | null>(null);

  grouped = computed(() =>
    this.skills.map((s) => ({
      skill: s.value,
      items: this.dimensions().filter((d) => d.skill === s.value),
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (dims) => {
        this.dimensions.set(dims);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canSave(): boolean {
    return this.fNombre.trim().length > 0 && !!this.fSkill;
  }

  save(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    const req = {
      nombre: this.fNombre.trim(),
      descripcion: this.fDescripcion.trim() || undefined,
      skill: this.fSkill,
    };
    const id = this.editingId();
    const op = id ? this.svc.update(id, req) : this.svc.create(req);
    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(id ? 'Dimensión actualizada.' : 'Dimensión creada.', 'Cerrar', { duration: 2500 });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Error al guardar.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  startEdit(d: DimensionResponse): void {
    this.editingId.set(d.id);
    this.fSkill = d.skill;
    this.fNombre = d.nombre;
    this.fDescripcion = d.descripcion ?? '';
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.fNombre = '';
    this.fDescripcion = '';
  }

  remove(d: DimensionResponse): void {
    this.svc.remove(d.id).subscribe({
      next: () => {
        this.snack.open('Dimensión eliminada.', 'Cerrar', { duration: 2500 });
        this.load();
      },
      error: (err) =>
        this.snack.open(err?.error?.message ?? 'No se pudo eliminar.', 'Cerrar', { duration: 4000 }),
    });
  }

  skillLabel(skill: SkillTipo): string {
    return this.skills.find((s) => s.value === skill)?.label ?? skill;
  }
}
