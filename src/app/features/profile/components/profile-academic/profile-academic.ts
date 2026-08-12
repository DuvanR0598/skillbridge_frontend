import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnChanges, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ProfileService } from '../../profile.service';
import { CampusResponse, EngineeringProgramResponse, UsuarioPerfilResponse } from '../../../../core/models/perfil.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-profile-academic',
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
  ],
  templateUrl: './profile-academic.html',
  styleUrl: './profile-academic.scss',
})
export class ProfileAcademic implements OnChanges {
  private fb = inject(FormBuilder);
  private profileSvc = inject(ProfileService);
  private authSvc = inject(AuthService);
  private toast = inject(MessageService);

  campuses = signal<CampusResponse[]>([]);
  readonly isStudent = this.authSvc.hasRole('ROLE_ESTUDIANTE');

  constructor() {
    // La sede es obligatoria para estudiantes.
    if (this.isStudent) {
      this.form.get('campus')?.addValidators(Validators.required);
      this.form.get('campus')?.updateValueAndValidity();
    }
    this.profileSvc.getCampuses().subscribe({
      next: (res) => this.campuses.set(res.data ?? []),
      error: () => this.campuses.set([]),
    });
  }

  profile = input<UsuarioPerfilResponse | null>(null);
  programs = input<EngineeringProgramResponse[]>([]);
  profileUpdated = output<UsuarioPerfilResponse>();

  saving = signal(false);
  programSearch = signal('');

  semesterOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  /** Programas filtrados por coincidencia de palabras (sin distinguir acentos/mayúsculas). */
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

  form: FormGroup = this.fb.group({
    engineeringProgram: [null, Validators.required],
    academicSemester: [null, [Validators.required, Validators.min(1), Validators.max(10)]],
    campus: [null],
  });

  /** Quita acentos y pasa a minúsculas para comparar sin distinción. */
  private normalize(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Limpia el buscador al cerrar el panel. */
  onProgramPanelToggle(open: boolean): void {
    if (!open) this.programSearch.set('');
  }

  /** Código oficial del programa seleccionado (campo de solo lectura). */
  get selectedProgramCodigo(): string {
    const value = this.form.get('engineeringProgram')?.value;
    if (!value) return '';
    return this.programs().find((p) => p.value === value)?.codigo ?? '';
  }

  ngOnChanges(): void {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      engineeringProgram: p.programaIngenieria ?? null,
      academicSemester: p.semestreAcademico ?? null,
      campus: p.sede ?? null,
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);

    const v = this.form.value;

    this.profileSvc
      .updateProfile({
        engineeringProgram: v.engineeringProgram,
        academicSemester: v.academicSemester,
        campus: v.campus ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.profileUpdated.emit(res.data);
          this.toast.add({
            severity: 'success',
            summary: 'Perfil actualizado',
            detail: 'La información académica se guardó correctamente.',
            life: 3000,
          });
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: err?.error?.message ?? 'No se pudo guardar la información.',
            life: 4000,
          });
        },
      });
  }
}
