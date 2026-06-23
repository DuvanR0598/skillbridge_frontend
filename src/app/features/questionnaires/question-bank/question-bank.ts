import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { QuestionForm } from '../question-form/question-form';
import { QuestionnairesService } from '../questionnaires.service';
import { PreguntaResponse } from '../../../core/models/questionnaire-admin.model';
import { DimensionsService } from '../../dimensions/dimensions.service';
import { DimensionResponse, SkillTipo } from '../../../core/models/dimension.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { resolveMediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-question-bank',
  providers: [ConfirmationService],
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    ConfirmDialogModule,
    DialogModule,
    QuestionForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.scss',
})
export class QuestionBank implements OnInit {
  private readonly svc = inject(QuestionnairesService);
  private readonly dimSvc = inject(DimensionsService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

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

  // Edición de la imagen
  editImageUrl = signal<string | null>(null);     // URL relativa actual (o nueva)
  editImagePreview = signal<string | null>(null); // src para mostrar
  uploadingEditImage = signal(false);

  // Paginación
  page = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);

  // Búsqueda por texto del enunciado (server-side, con debounce)
  searchText = signal('');
  private searchTimer?: ReturnType<typeof setTimeout>;

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

  // Filtro por skill y dimensión
  selectedSkill = signal<SkillTipo | null>(null);
  selectedDimension = signal<number | null>(null);

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
    this.editImageUrl.set(q.imagenUrl ?? null);
    this.editImagePreview.set(resolveMediaUrl(q.imagenUrl));
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  // ── Imagen en edición ──────────────────────────────────────

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.errorMsg.set('Formato de imagen no permitido. Usa JPEG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg.set('La imagen no puede superar 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => this.editImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.uploadingEditImage.set(true);
    this.errorMsg.set(null);
    this.svc.uploadQuestionImage(file).subscribe({
      next: (res) => {
        this.uploadingEditImage.set(false);
        this.editImageUrl.set(res.data.imagenUrl);
        this.editImagePreview.set(resolveMediaUrl(res.data.imagenUrl));
      },
      error: (err) => {
        this.uploadingEditImage.set(false);
        this.editImagePreview.set(resolveMediaUrl(this.editImageUrl()));
        this.errorMsg.set(err?.error?.message ?? 'No se pudo subir la imagen.');
      },
    });
    input.value = '';
  }

  removeEditImage(): void {
    this.editImageUrl.set(null);
    this.editImagePreview.set(null);
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
    // ¿cambió la imagen? (incluye quitarla → null)
    const newImg = this.editImageUrl();
    const oldImg = q.imagenUrl ?? null;
    if (newImg !== oldImg) {
      calls.push(this.svc.updateQuestionImage(q.idPregunta, newImg));
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
          // Asegurar que la imagen refleje el estado final (llamadas en paralelo).
          updated.imagenUrl = this.editImageUrl() ?? undefined;
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

  onFilterSkill(skill: SkillTipo | null): void {
    this.selectedSkill.set(skill);
    this.selectedDimension.set(null); // resetear dimensión al cambiar skill
    this.page.set(0);
    this.load();
  }

  onFilterDimension(id: number | null): void {
    this.selectedDimension.set(id);
    this.page.set(0);
    this.load();
  }

  /** Dimensiones filtradas por el skill seleccionado (para el selector de dimensión). */
  filteredDimensions(): DimensionResponse[] {
    const skill = this.selectedSkill();
    if (!skill) return this.dimensions();
    return this.dimensions().filter((d) => d.skill === skill);
  }

  /** Búsqueda con debounce: recarga desde la primera página tras 350ms sin teclear. */
  onSearch(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(0);
      this.load();
    }, 350);
  }

  private load(): void {
    this.loading.set(true);
    this.svc
      .getQuestionsPaged(this.page(), this.pageSize(), this.selectedType(), this.searchText(), this.selectedSkill(), this.selectedDimension())
      .subscribe({
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
    this.toast.add({
      severity: 'success',
      summary: 'Pregunta creada',
      detail: 'La pregunta se agregó al banco correctamente.',
      life: 3000,
    });
  }

  remove(q: PreguntaResponse): void {
    this.confirm.confirm({
      header: 'Eliminar pregunta',
      message: `¿Seguro que deseas eliminar esta pregunta?\n\n"${q.texto}"`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.doRemove(q.idPregunta),
    });
  }

  private doRemove(id: number): void {
    this.errorMsg.set(null);
    this.svc.deleteQuestion(id).subscribe({
      next: () => {
        // Si era la última de la página actual, retroceder una página.
        if (this.questions().length === 1 && this.page() > 0) {
          this.page.update((p) => p - 1);
        }
        this.load();
        this.toast.add({
          severity: 'success',
          summary: 'Pregunta eliminada',
          detail: 'La pregunta se eliminó del banco correctamente.',
          life: 3000,
        });
      },
      error: (err) => {
        const msg =
          err?.error?.message ?? 'No se pudo eliminar (puede estar en uso en un cuestionario).';
        this.errorMsg.set(msg);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: msg,
          life: 4000,
        });
      },
    });
  }

  imageSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
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
