import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OpcionPreguntaRequest, PreguntaRequest, PreguntaResponse, QuestionType } from '../../../core/models/questionnaire-admin.model';
import { QuestionnairesService } from '../questionnaires.service';
import { DimensionsService } from '../../dimensions/dimensions.service';
import { DimensionResponse, SKILL_OPTIONS, SkillTipo } from '../../../core/models/dimension.model';
import { resolveMediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatProgressSpinnerModule,
  ],
  templateUrl: './question-form.html',
  styleUrl: './question-form.scss',
})
export class QuestionForm {

  private fb  = inject(FormBuilder);
  private svc = inject(QuestionnairesService);
  private dimSvc = inject(DimensionsService);

  // Evento: pregunta creada con éxito
  questionCreated = output<PreguntaResponse>();
  cancelled       = output<void>();

  saving   = signal(false);
  errorMsg = signal<string | null>(null);

  // Imagen adjunta de la pregunta
  imageUrl    = signal<string | null>(null); // URL relativa devuelta por el backend
  imagePreview = signal<string | null>(null); // src para mostrar (absoluta o base64)
  uploadingImage = signal(false);

  // Dimensiones disponibles (para clasificar la pregunta), agrupadas por skill
  dimensions = signal<DimensionResponse[]>([]);
  skillGroups = SKILL_OPTIONS;

  constructor() {
    this.dimSvc.list().subscribe((dims) => this.dimensions.set(dims));
  }

  dimsBySkill(skill: SkillTipo): DimensionResponse[] {
    return this.dimensions().filter((d) => d.skill === skill);
  }

  questionTypes: { value: QuestionType; label: string }[] = [
    { value: 'VERDADERO_FALSO',      label: 'Verdadero / Falso' },
    { value: 'LIKERT',          label: 'Escala Likert' },
    { value: 'OPCION_UNICA',   label: 'Selección única' },
    { value: 'OPCION_MULTIPLE', label: 'Selección múltiple' },
    { value: 'DESCRIPCION',     label: 'Descripción (texto libre)' },
  ];

  form: FormGroup = this.fb.group({
    questionType: ['OPCION_UNICA', Validators.required],
    text:         ['', [Validators.required, Validators.maxLength(1000)]],
    help:         ['', Validators.maxLength(300)],
    description:  ['', Validators.maxLength(500)],
    maxOptions:   [null],
    dimensionId:  [null],
    options:      this.fb.array([])
  });

  get options(): FormArray {
    return this.form.get('options') as FormArray;
  }

  get selectedType(): QuestionType {
    return this.form.get('questionType')?.value;
  }

  get needsOptions(): boolean {
    return this.selectedType !== 'DESCRIPCION';
  }

  /** Las preguntas con opciones requieren al menos 2. */
  get hasMinOptions(): boolean {
    return !this.needsOptions || this.options.length >= 2;
  }

  /** Mensaje de validación de opciones para mostrar en la UI (o null si todo OK). */
  get optionsError(): string | null {
    if (!this.hasMinOptions) {
      return 'Debes agregar al menos 2 opciones de respuesta.';
    }
    return null;
  }

  get canSubmit(): boolean {
    return this.form.valid && !this.optionsError && !this.saving();
  }

  onTypeChange(): void {
    this.options.clear();
    const type = this.selectedType;

    if (type === 'VERDADERO_FALSO') {
      this.addOption('Verdadero', 1, 1);
      this.addOption('Falso',     0, 2);
    } else if (type === 'LIKERT') {
      const labels = [
        'Totalmente en desacuerdo',
        'En desacuerdo', 'Neutral',
        'De acuerdo', 'Totalmente de acuerdo'
      ];
      labels.forEach((lbl, i) =>
        this.addOption(lbl, i + 1, i + 1)
      );
    }
  }

  addOption(
    text    = '',
    weight  = 0,
    order   = this.options.length + 1
  ): void {
    this.options.push(this.fb.group({
      text:         [text,    [Validators.required, Validators.maxLength(500)]],
      weight:       [weight,  [Validators.required, Validators.min(0)]],
      displayOrder: [order,   [Validators.required, Validators.min(1)]]
    }));
  }

  removeOption(i: number): void {
    this.options.removeAt(i);
    // Reordenar
    this.options.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ displayOrder: idx + 1 });
    });
  }

  onSubmit(): void {
    if (this.saving()) return;

    // Validación de opciones antes de llamar al backend
    const optErr = this.optionsError;
    if (this.form.invalid || optErr) {
      this.form.markAllAsTouched();
      this.errorMsg.set(optErr ?? 'Revisa los campos del formulario.');
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;
    const req: PreguntaRequest = {
      tipoPregunta: v.questionType,
      texto:        v.text.trim(),
      imagenUrl:    this.imageUrl() ?? undefined,
      ayuda:        v.help     || undefined,
      maxOpciones:  v.maxOptions   || undefined,
      idDimension:  v.dimensionId  || undefined,
      // Mapear las claves del form (text/weight/displayOrder)
      // a las que espera el backend (texto/peso/ordenVisualizacion).
      // No se envía "isCorrecta": en soft skills se mide por peso, no hay
      // respuesta correcta/incorrecta.
      opcionPreguntaRequest: this.needsOptions
        ? (v.options as any[]).map((o, i): OpcionPreguntaRequest => ({
            texto:              (o.text ?? '').trim(),
            peso:               o.weight ?? 0,
            ordenVisualizacion: o.displayOrder ?? i + 1,
          }))
        : undefined
    };

    this.svc.createQuestion(req).subscribe({
      next: res => {
        this.saving.set(false);
        this.form.reset({ questionType: 'OPCION_UNICA' });
        this.options.clear();
        this.removeImage();
        this.questionCreated.emit(res.data);
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al crear la pregunta.');
      }
    });
  }

  // ── Imagen de la pregunta ──────────────────────────────────

  onImageSelected(event: Event): void {
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

    // Preview inmediato (base64) mientras sube
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.uploadingImage.set(true);
    this.errorMsg.set(null);
    this.svc.uploadQuestionImage(file).subscribe({
      next: (res) => {
        this.uploadingImage.set(false);
        const url = res.data.imagenUrl;
        this.imageUrl.set(url);
        this.imagePreview.set(resolveMediaUrl(url));
      },
      error: (err) => {
        this.uploadingImage.set(false);
        this.imagePreview.set(null);
        this.errorMsg.set(err?.error?.message ?? 'No se pudo subir la imagen.');
      },
    });
    // Permite volver a elegir el mismo archivo
    input.value = '';
  }

  removeImage(): void {
    this.imageUrl.set(null);
    this.imagePreview.set(null);
  }

  cancel(): void { this.cancelled.emit(); }
}
