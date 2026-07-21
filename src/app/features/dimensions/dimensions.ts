import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DimensionsService } from './dimensions.service';
import { DimensionResponse, SKILL_OPTIONS, SkillTipo, skillMeta } from '../../core/models/dimension.model';

@Component({
  selector: 'app-dimensions',
  providers: [ConfirmationService],
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DialogModule,
    ConfirmDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dimensions.html',
  styleUrl: './dimensions.scss',
})
export class Dimensions implements OnInit {
  private svc     = inject(DimensionsService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);

  skills = SKILL_OPTIONS;
  protected readonly skillMeta = skillMeta;

  loading    = signal(true);
  saving     = signal(false);
  showDialog = signal(false);
  dimensions = signal<DimensionResponse[]>([]);

  // Filtros
  searchText   = signal('');
  filterSkill  = signal<SkillTipo | 'ALL'>('ALL');

  // Acordeón: grupos de skill expandidos. Al buscar o filtrar se expanden todos.
  expandedSkills = signal<ReadonlySet<string>>(new Set());
  isFiltering = computed(
    () => !!this.searchText().trim() || this.filterSkill() !== 'ALL',
  );

  fSkill: SkillTipo = 'PENSAMIENTO_CRITICO';
  fNombre = '';
  fDescripcion = '';
  editingId = signal<number | null>(null);

  grouped = computed(() => {
    const term  = this.searchText().toLowerCase().trim();
    const skill = this.filterSkill();
    const filtered = this.dimensions().filter((d) =>
      (skill === 'ALL' || d.skill === skill) &&
      (!term || d.nombre.toLowerCase().includes(term))
    );
    return this.skills
      .filter((s) => skill === 'ALL' || s.value === skill)
      .map((s) => ({
        skill: s.value,
        items: filtered.filter((d) => d.skill === s.value),
      }))
      .filter((g) => g.items.length > 0);
  });

  skillFilters: { value: SkillTipo | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Todas' },
    ...SKILL_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
  ];

  isExpanded(skill: string): boolean {
    return this.isFiltering() || this.expandedSkills().has(skill);
  }

  toggleGroup(skill: string): void {
    const next = new Set(this.expandedSkills());
    if (next.has(skill)) next.delete(skill);
    else next.add(skill);
    this.expandedSkills.set(next);
  }

  expandAll(): void {
    this.expandedSkills.set(new Set(this.grouped().map((g) => g.skill)));
  }

  collapseAll(): void {
    this.expandedSkills.set(new Set());
  }

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

  openCreate(): void {
    this.editingId.set(null);
    this.fSkill = 'PENSAMIENTO_CRITICO';
    this.fNombre = '';
    this.fDescripcion = '';
    this.showDialog.set(true);
  }

  openEdit(d: DimensionResponse): void {
    this.editingId.set(d.id);
    this.fSkill = d.skill;
    this.fNombre = d.nombre;
    this.fDescripcion = d.descripcion ?? '';
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editingId.set(null);
    this.fNombre = '';
    this.fDescripcion = '';
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
        this.toast.add({
          severity: 'success',
          summary: id ? 'Dimensión actualizada' : 'Dimensión creada',
          detail: id ? 'Los cambios se guardaron correctamente.' : 'La dimensión se agregó correctamente.',
        });
        this.closeDialog();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error al guardar', detail: err?.error?.message ?? 'Ocurrió un error al guardar la dimensión.' });
      },
    });
  }

  remove(d: DimensionResponse): void {
    this.confirm.confirm({
      header: 'Eliminar dimensión',
      message: `¿Seguro que deseas eliminar la dimensión <strong>${d.nombre}</strong>? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.doRemove(d),
    });
  }

  private doRemove(d: DimensionResponse): void {
    this.svc.remove(d.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Dimensión eliminada', detail: 'La dimensión se eliminó correctamente.' });
        this.load();
      },
      error: (err) =>
        this.toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: err?.error?.message ?? 'No se pudo eliminar la dimensión.' }),
    });
  }

  skillLabel(skill: SkillTipo): string {
    return this.skills.find((s) => s.value === skill)?.label ?? skill;
  }
}
