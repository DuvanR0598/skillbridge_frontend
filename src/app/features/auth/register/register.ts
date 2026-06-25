import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

// Validador personalizado: las contraseñas deben coincidir
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatStepperModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirm = signal(false);

  idTypeOptions: { value: 'CC' | 'TI' | 'CE' | 'PA'; label: string }[] = [
    { value: 'CC', label: 'CC - Cédula de Ciudadanía' },
    { value: 'TI', label: 'TI - Tarjeta de Identidad' },
    { value: 'CE', label: 'CE - Cédula de Extranjería' },
    { value: 'PA', label: 'PA - Pasaporte' },
  ];

  form: FormGroup = this.fb.group(
    {
      tipoIdentificacion: ['CC', Validators.required],
      numeroIdentificacion: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-Z0-9]+$/),
        ],
      ],
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatch },
  );

  get tipoIdentificacion() {
    return this.form.get('tipoIdentificacion')!;
  }
  get numeroIdentificacion() {
    return this.form.get('numeroIdentificacion')!;
  }
  get nombre() {
    return this.form.get('nombre')!;
  }
  get apellido() {
    return this.form.get('apellido')!;
  }
  get email() {
    return this.form.get('email')!;
  }
  get password() {
    return this.form.get('password')!;
  }
  get confirmPassword() {
    return this.form.get('confirmPassword')!;
  }
  get acceptTerms() {
    return this.form.get('acceptTerms')!;
  }

  // Indicadores de fuerza de contraseña
  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const val = this.password.value;
    if (!val) return null;
    if (val.length < 8) return 'weak';
    const hasLower = /[a-z]/.test(val);
    const hasUpper = /[A-Z]/.test(val);
    const hasNumber = /\d/.test(val);
    const hasSpecial = /[^a-zA-Z\d]/.test(val);
    const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    return 'strong';
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .register({
        tipoIdentificacion: this.tipoIdentificacion.value,
        numeroIdentificacion: this.numeroIdentificacion.value.trim(),
        nombre: this.nombre.value.trim(),
        apellido: this.apellido.value.trim(),
        email: this.email.value.trim().toLowerCase(),
        password: this.password.value,
      })
      .subscribe({
        next: () => this.loading.set(false),
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err?.error?.message ?? 'Error al crear la cuenta. Intenta de nuevo.',
          );
        },
      });
  }

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') this.showPassword.update((v) => !v);
    else this.showConfirm.update((v) => !v);
  }
}
