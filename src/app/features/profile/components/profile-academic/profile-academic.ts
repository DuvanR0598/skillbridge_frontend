import { CommonModule } from '@angular/common';
import { Component, inject, input, OnChanges, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ProfileService } from '../../profile.service';
import { EngineeringProgramResponse, UsuarioPerfilResponse } from '../../../../core/models/perfil.model';

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

  profile = input<UsuarioPerfilResponse | null>(null);
  programs = input<EngineeringProgramResponse[]>([]);
  profileUpdated = output<UsuarioPerfilResponse>();

  saving = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  semesterOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  form: FormGroup = this.fb.group({
    engineeringProgram: [null, Validators.required],
    academicSemester: [null, [Validators.required, Validators.min(1), Validators.max(10)]],
  });

  ngOnChanges(): void {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      engineeringProgram: p.programaIngenieria ?? null,
      academicSemester: p.semestreAcademico ?? null,
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.clearMessages();

    const v = this.form.value;

    this.profileSvc
      .updateProfile({
        engineeringProgram: v.engineeringProgram,
        academicSemester: v.academicSemester,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.profileUpdated.emit(res.data);
          this.showSuccess('Información académica guardada.');
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMsg.set(err?.error?.message ?? 'Error al guardar.');
        },
      });
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }

  private clearMessages(): void {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }
}
