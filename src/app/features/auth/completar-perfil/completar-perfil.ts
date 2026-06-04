import { Component, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import {
  EngineeringProgramResponse,
  CompleteProfileRequest
} from '../../../core/models/perfil.model';
import { ApiResponse } from '../../../core/models/api-response.model';

@Component({
  selector: 'app-completar-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatStepperModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './completar-perfil.html',
  styleUrl: './completar-perfil.scss',
})
export class CompletarPerfil implements OnInit{

  private fb     = inject(FormBuilder);
  private http   = inject(HttpClient);
  private router = inject(Router);

  private readonly API = environment.apiUrl;

  programs     = signal<EngineeringProgramResponse[]>([]);
  loading      = signal(false);
  savingStep   = signal(false);
  errorMessage = signal<string | null>(null);
  currentStep  = signal(0);

  // Fecha máxima y mínima para el datepicker
  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() - 10));
  minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 100));

  genderOptions = [
    { value: 'MASCULINO',           label: 'Masculino' },
    { value: 'FEMENINO',            label: 'Femenino' },
    { value: 'NO_BINARIO',          label: 'No binario' },
    { value: 'PREFIERO_NO_DECIRLO', label: 'Prefiero no decirlo' },
  ];

  semesterOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  // ── Paso 1: datos personales ──────────────────────────────
  personalForm: FormGroup = this.fb.group({
    dateOfBirth: [null, Validators.required],
    gender:      [null, Validators.required]
  });

  // ── Paso 2: datos académicos ──────────────────────────────
  academicForm: FormGroup = this.fb.group({
    engineeringProgram: [null, Validators.required],
    academicSemester:   [null, Validators.required],
    studentCode:        [''],
  });

  // ── Paso 3: sobre mí (opcional) ───────────────────────────
  bioForm: FormGroup = this.fb.group({
    biography: ['', Validators.maxLength(500)]
  });

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.loading.set(true);
    this.http.get<ApiResponse<EngineeringProgramResponse[]>>(
      `${this.API}/perfil/programas`
    ).subscribe({
      next:  res => {
        this.programs.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando programas:', err);
        this.programs.set([]);
        this.loading.set(false);
      }
    });
  }

  nextStep(): void {
    this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    this.currentStep.update(s => s - 1);
  }

  // Calcular porcentaje de completitud en tiempo real
  get completionPct(): number {
    let filled = 0;
    const total = 7;
    const pv = this.personalForm.value;
    const av = this.academicForm.value;
    const bv = this.bioForm.value;

    if (pv.dateOfBirth)        filled++;
    if (pv.gender)             filled++;
    if (av.engineeringProgram) filled++;
    if (av.academicSemester)   filled++;
    if (bv.biography)          filled++;

    return Math.round((filled / total) * 100);
  }

  onSubmit(): void {
    this.savingStep.set(true);
    this.errorMessage.set(null);

    const pv = this.personalForm.value;
    const av = this.academicForm.value;
    const bv = this.bioForm.value;

    // Formatear la fecha a YYYY-MM-DD
    const dob = pv.dateOfBirth
      ? (pv.dateOfBirth as Date).toISOString().split('T')[0]
      : undefined;

    const payload: CompleteProfileRequest = {
      dateOfBirth:        dob,
      gender:             pv.gender        || undefined,
      engineeringProgram: av.engineeringProgram,
      academicSemester:   av.academicSemester,
      studentCode:        av.studentCode   || undefined,
      academicYear:       av.academicYear  || undefined,
      biography:          bv.biography     || undefined,
    };

    this.http.patch<ApiResponse<unknown>>(
      `${this.API}/usuarios/me/perfil`, payload
    ).subscribe({
      next: () => {
        localStorage.setItem('profileCompleted', 'true');
        this.savingStep.set(false);
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.savingStep.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Error al guardar el perfil. Intenta de nuevo.'
        );
      }
    });
  }

  skipForNow(): void {
    // El guard de perfil lo atrapará si intenta acceder a secciones restringidas
    this.router.navigate(['/app/dashboard']);
  }
}
