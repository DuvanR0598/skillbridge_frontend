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
  templateUrl: './dimensions.html',
  styleUrl: './dimensions.scss',
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
