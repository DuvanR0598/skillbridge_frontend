import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { QuestionnairesService } from '../questionnaires.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EngineeringProgramResponse } from '../../../core/models/perfil.model';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatDatepickerModule,
    MatNativeDateModule, MatProgressSpinnerModule,
  ],
  templateUrl: './questionnaire-form.html',
  styleUrl: './questionnaire-form.scss',
})
export class QuestionnaireForm implements OnInit {

  private fb      = inject(FormBuilder);
  private svc     = inject(QuestionnairesService);
  private authSvc = inject(AuthService);
  private http    = inject(HttpClient);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);

  private readonly API = environment.apiUrl;

  saving      = signal(false);
  loading     = signal(false);
  errorMsg    = signal<string | null>(null);
  isEdit      = signal(false);
  qId         = signal<number | null>(null);
  programs    = signal<EngineeringProgramResponse[]>([]);
  programSearch = signal('');

  /** Programas filtrados por coincidencia de palabras (sin acentos/mayúsculas). */
  filteredPrograms = computed(() => {
    const term = this.normalize(this.programSearch().trim());
    const list = this.programs();
    if (!term) return list;
    const words = term.split(/\s+/);
    return list.filter((p) => {
      const name = this.normalize(p.displayName);
      return words.every((w) => name.includes(w));
    });
  });

  /** Quita acentos y pasa a minúsculas para comparar sin distinción. */
  private normalize(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Limpia el buscador al cerrar el panel. */
  onProgramPanelToggle(open: boolean): void {
    if (!open) this.programSearch.set('');
  }

  form: FormGroup = this.fb.group({
    name: ['', [
      Validators.required,
      Validators.maxLength(200)
    ]],
    purpose: ['', Validators.maxLength(500)],
    instructions: ['', Validators.maxLength(1000)],
    appPeriodStart: [null],
    startTime:      [''],
    appPeriodEnd:   [null],
    endTime:        [''],
    timeLimitMinutes: [null, [Validators.min(1)]],
    randomOrder: [false],
    // 'GENERAL' = para todos los estudiantes; o el valor (enum) de un programa.
    targetProgram: ['GENERAL']
  });

  // Fecha mínima seleccionable en los date pickers: hoy (no se programa en el pasado)
  minDate = new Date();

  /** Combina fecha (Date) + hora ("HH:mm") en un objeto Date local. */
  private toDate(date: Date | null, time: string | null): Date | null {
    if (!date) return null;
    const d = new Date(date);
    let h = 0, m = 0;
    if (time && /^\d{1,2}:\d{2}$/.test(time)) {
      const [hh, mm] = time.split(':');
      h = +hh; m = +mm;
    }
    d.setHours(h, m, 0, 0);
    return d;
  }

  /** Combina fecha + hora en un LocalDateTime ISO sin zona (para el backend). */
  private toLocalDateTime(date: Date | null, time: string | null): string | undefined {
    const d = this.toDate(date, time);
    if (!d) return undefined;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
         + `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  /** Valida la ventana de disponibilidad. Devuelve mensaje o null. */
  dateRangeError(): string | null {
    const v = this.form.value;

    // Si se eligió una fecha, la hora es obligatoria (evita comparaciones a medianoche)
    if (v.appPeriodStart && !v.startTime) return 'Indica la hora de inicio.';
    if (v.appPeriodEnd && !v.endTime)     return 'Indica la hora de fin.';

    const start = this.toDate(v.appPeriodStart, v.startTime);
    const end   = this.toDate(v.appPeriodEnd, v.endTime);

    if (start && end && start.getTime() >= end.getTime()) {
      return 'La fecha y hora de inicio deben ser anteriores a las de fin.';
    }
    if (end && end.getTime() <= Date.now()) {
      return 'La fecha y hora de fin deben ser futuras.';
    }
    return null;
  }

  ngOnInit(): void {
    this.loadPrograms();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.qId.set(Number(id));
      this.loadExisting(Number(id));
    }
  }

  private loadPrograms(): void {
    this.http
      .get<ApiResponse<EngineeringProgramResponse[]>>(`${this.API}/perfil/programas`)
      .subscribe({
        next: (res) => this.programs.set(res.data ?? []),
        error: () => this.programs.set([]),
      });
  }

  private loadExisting(id: number): void {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: res => {
        const q = res.data;
        const start = q.fechaInicio ? new Date(q.fechaInicio) : null;
        const end   = q.fechaFin    ? new Date(q.fechaFin)    : null;
        const pad = (n: number) => String(n).padStart(2, '0');
        const hhmm = (d: Date | null) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '');

        this.form.patchValue({
          name:             q.nombre,
          purpose:          q.objetivo ?? '',
          instructions:     q.instrucciones ?? '',
          appPeriodStart:   start,
          startTime:        hhmm(start),
          appPeriodEnd:     end,
          endTime:          hhmm(end),
          timeLimitMinutes: q.tiempoLimiteMinutos ?? null,
          randomOrder:      q.ordenAleatorio,
          targetProgram:    q.programaObjetivo ?? 'GENERAL'
        });
        if (!q.editable) this.form.disable();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    const rangeErr = this.dateRangeError();
    if (rangeErr) {
      this.errorMsg.set(rangeErr);
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const fechaInicio = this.toLocalDateTime(v.appPeriodStart, v.startTime);
    const fechaFin    = this.toLocalDateTime(v.appPeriodEnd, v.endTime);
    const tiempoLimiteMinutos = v.timeLimitMinutes ? Number(v.timeLimitMinutes) : null;
    // 'GENERAL' → null (todos los estudiantes); de lo contrario, el programa elegido.
    const programaObjetivo = v.targetProgram && v.targetProgram !== 'GENERAL'
      ? v.targetProgram
      : null;

    if (this.isEdit()) {
      this.svc.updateSettings(this.qId()!, {
        nombre:            v.name,
        objetivo:          v.purpose || undefined,
        instrucciones:     v.instructions || undefined,
        fechaInicio,
        fechaFin,
        ordenAleatorio:    v.randomOrder,
        tiempoLimiteMinutos,
        programaObjetivo
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/app/questionnaires']);
        },
        error: err => {
          this.saving.set(false);
          this.errorMsg.set(err?.error?.message ?? 'Error al guardar.');
        }
      });
    } else {
      this.svc.create({
        nombre:            v.name,
        objetivo:          v.purpose || undefined,
        instrucciones:     v.instructions || undefined,
        fechaInicio,
        fechaFin,
        ordenAleatorio:    v.randomOrder,
        tiempoLimiteMinutos,
        programaObjetivo
      }).subscribe({
        next: res => {
          this.saving.set(false);
          // Ir directo al builder
          this.router.navigate([
            '/app/questionnaires', res.data.idCuestionario, 'builder'
          ]);
        },
        error: err => {
          this.saving.set(false);
          this.errorMsg.set(err?.error?.message ?? 'Error al crear.');
        }
      });
    }
  }
}
