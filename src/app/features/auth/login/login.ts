import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  // ── Estado reactivo ────────────────────────────────────────
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  // ── Formulario reactivo ────────────────────────────────────
  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // ── Getters para acceder a los controles en el template ────
  get email() {
    return this.form.get('email')!;
  }
  get password() {
    return this.form.get('password')!;
  }

  // ── Submit ─────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .login({
        email: this.form.value.email.trim().toLowerCase(),
        password: this.form.value.password,
        deviceInfo: navigator.userAgent,
      })
      .subscribe({
        next: () => {
          // AuthService maneja la navegación automáticamente
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.message ?? 'Error al iniciar sesión. Intenta de nuevo.';
          this.errorMessage.set(msg);
        },
      });
  }

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}
