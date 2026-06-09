import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { QuestionnairesService } from '../questionnaires.service';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
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
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);

  saving      = signal(false);
  loading     = signal(false);
  errorMsg    = signal<string | null>(null);
  isEdit      = signal(false);
  qId         = signal<number | null>(null);

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
    targetPopulation: ['', Validators.maxLength(300)],
    randomOrder: [false]
  });

  /** Combina fecha (Date) + hora ("HH:mm") en un LocalDateTime ISO sin zona. */
  private toLocalDateTime(date: Date | null, time: string | null): string | undefined {
    if (!date) return undefined;
    const d = new Date(date);
    let h = 0, m = 0;
    if (time && /^\d{1,2}:\d{2}$/.test(time)) {
      const [hh, mm] = time.split(':');
      h = +hh; m = +mm;
    }
    d.setHours(h, m, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
         + `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  /** Valida que el inicio sea anterior al fin. Devuelve mensaje o null. */
  dateRangeError(): string | null {
    const v = this.form.value;
    const start = this.toLocalDateTime(v.appPeriodStart, v.startTime);
    const end = this.toLocalDateTime(v.appPeriodEnd, v.endTime);
    if (start && end && start >= end) {
      return 'La fecha/hora de inicio debe ser anterior a la de fin.';
    }
    return null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.qId.set(Number(id));
      this.loadExisting(Number(id));
    }
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
          targetPopulation: q.targetPopulation ?? '',
          randomOrder:      q.ordenAleatorio
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

    if (this.isEdit()) {
      this.svc.updateSettings(this.qId()!, {
        nombre:            v.name,
        objetivo:          v.purpose || undefined,
        instrucciones:     v.instructions || undefined,
        fechaInicio,
        fechaFin,
        ordenAleatorio:    v.randomOrder
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
        ordenAleatorio:    v.randomOrder
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
