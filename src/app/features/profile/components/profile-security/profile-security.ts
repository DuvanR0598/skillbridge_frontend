import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';

function passwordsMatch(g: AbstractControl): ValidationErrors | null {
  const pw  = g.get('newPassword')?.value;
  const cpw = g.get('confirmPassword')?.value;
  return pw === cpw ? null : { mismatch: true };
}

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatDividerModule,
  ],
  templateUrl: './profile-security.html',
  styleUrl: './profile-security.scss',
})
export class ProfileSecurity {

  private fb      = inject(FormBuilder);
  private http    = inject(HttpClient);
  private authSvc = inject(AuthService);

  private API = environment.apiUrl;

  currentUser = this.authSvc.currentUser;

  saving     = signal(false);
  errorMsg   = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  isGoogleUser = () => this.currentUser()?.authProvider === 'GOOGLE';

  form: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(100),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    ]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  get newPw() { return this.form.get('newPassword')!; }

  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const val = this.newPw.value;
    if (!val) return null;
    if (val.length < 8) return 'weak';
    const score = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/]
                    .filter(r => r.test(val)).length;
    return score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.clearMessages();

    this.http.patch(`${this.API}/users/me/password`, {
      currentPassword: this.form.value.currentPassword,
      newPassword:     this.form.value.newPassword
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.showSuccess('Contraseña actualizada correctamente.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(
          err?.error?.message ?? 'Error al cambiar la contraseña.'
        );
      }
    });
  }

  revokeAllSessions(): void {
    this.authSvc.logout();
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3500);
  }

  private clearMessages(): void {
    this.errorMsg.set(null); this.successMsg.set(null);
  }
}
