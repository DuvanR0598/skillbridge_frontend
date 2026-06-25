import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';

function passwordsMatch(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('contrasenaNueva')?.value;
  const cpw = g.get('confirmPassword')?.value;
  return pw === cpw ? null : { mismatch: true };
}

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './profile-security.html',
  styleUrl: './profile-security.scss',
})
export class ProfileSecurity {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authSvc = inject(AuthService);
  private readonly toast = inject(MessageService);

  private readonly API = environment.apiUrl;

  currentUser = this.authSvc.currentUser;

  saving = signal(false);

  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  isGoogleUser = () => this.currentUser()?.authProvider === 'GOOGLE';

  form: FormGroup = this.fb.group(
    {
      contrasenaActual: ['', Validators.required],
      contrasenaNueva: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  get newPw() {
    return this.form.get('contrasenaNueva')!;
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const val = this.newPw.value;
    if (!val) return null;
    if (val.length < 8) return 'weak';
    const score = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(val)).length;
    return score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);

    this.http
      .patch(`${this.API}/usuarios/me/cambiar-contrasena`, {
        contrasenaActual: this.form.value.contrasenaActual,
        contrasenaNueva: this.form.value.contrasenaNueva,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.reset();
          this.toast.add({
            severity: 'success',
            summary: 'Contraseña actualizada',
            detail: 'Tu contraseña se actualizó correctamente.',
            life: 3000,
          });
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo actualizar',
            detail: err?.error?.message ?? 'Error al cambiar la contraseña.',
            life: 4000,
          });
        },
      });
  }

  revokeAllSessions(): void {
    this.authSvc.logout();
  }
}
