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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
  providers: [ConfirmationService],
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    ConfirmDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-plans.html',
  styleUrl: './entry-plans.scss',
})
export class EntryPlans implements OnInit {
  private svc = inject(ScoreMatrixService);
  private toast = inject(MessageService);
  private confirm = inject(ConfirmationService);

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
        this.toast.add({
          severity: 'success',
          summary: editId ? 'Plan actualizado' : 'Plan agregado',
          detail: editId
            ? 'El plan de fortalecimiento se actualizó correctamente.'
            : 'El plan de fortalecimiento se agregó correctamente.',
          life: 3000,
        });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: err?.error?.message ?? 'Error al guardar el plan.',
          life: 4000,
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
    this.confirm.confirm({
      header: 'Eliminar plan de fortalecimiento',
      message: `¿Seguro que deseas eliminar el plan "${p.titulo}" (${this.axisLabel(p.planAxis)})? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.removePlan(this.matrixId(), p.id).subscribe({
          next: () => {
            this.toast.add({
              severity: 'success',
              summary: 'Plan eliminado',
              detail: 'El plan de fortalecimiento se eliminó correctamente.',
              life: 3000,
            });
            this.load();
          },
          error: (err) =>
            this.toast.add({
              severity: 'error',
              summary: 'No se pudo eliminar',
              detail: err?.error?.message ?? 'No se pudo eliminar el plan.',
              life: 4000,
            }),
        });
      },
    });
  }

  axisLabel(a: PlanAxis): string {
    return this.axes.find((x) => x.value === a)?.label ?? a;
  }
  accionLabel(t: TipoAccion): string {
    return this.tipos.find((x) => x.value === t)?.label ?? t;
  }
}
