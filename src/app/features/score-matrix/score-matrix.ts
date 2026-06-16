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
  templateUrl: './score-matrix.html',
  styleUrl: './score-matrix.scss',
})
export class ScoreMatrix implements OnInit {
  private readonly svc = inject(ScoreMatrixService);
  private readonly dimSvc = inject(DimensionsService);
  private readonly qSvc = inject(QuestionnairesService);
  private readonly snack = inject(MatSnackBar);

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
    return (
      this.fMin != null &&
      this.fMax != null &&
      this.fMin < this.fMax &&
      this.fDescripcion.trim().length > 0 &&
      this.fCaracteristicas.trim().length > 0
    );
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
