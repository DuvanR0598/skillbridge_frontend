import { CommonModule } from '@angular/common';
import { Component, inject, input, OnChanges, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ProfileService } from '../../profile.service';
import { Gender, UsuarioPerfilResponse } from '../../../../core/models/perfil.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { resolveMediaUrl } from '../../../../core/utils/media-url';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  templateUrl: './profile-info.html',
  styleUrl: './profile-info.scss',
})
export class ProfileInfo implements OnChanges {

  private fb         = inject(FormBuilder);
  private profileSvc = inject(ProfileService);
  private authSvc    = inject(AuthService);
  private toast      = inject(MessageService);

  /** Documento del usuario (solo lectura; vive en la cuenta, no en el perfil). */
  get tipoIdentificacionLabel(): string {
    const u = this.authSvc.currentUser();
    return u?.visualizacionTipoIdentificacion || u?.tipoIdentificacion || '—';
  }
  get numeroIdentificacion(): string {
    return this.authSvc.currentUser()?.numeroIdentificacion || '—';
  }

  profile        = input<UsuarioPerfilResponse | null>(null);
  profileUpdated = output<UsuarioPerfilResponse>();

  saving       = signal(false);
  uploading    = signal(false);
  errorMsg     = signal<string | null>(null);
  successMsg   = signal<string | null>(null);
  previewUrl   = signal<string | null>(null);

  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() - 10));
  minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 100));

  genderOptions: { value: Gender;   label: string }[] = [
    { value: 'MASCULINO',           label: 'Masculino' },
    { value: 'FEMENINO',            label: 'Femenino' },
    { value: 'NO_BINARIO',          label: 'No binario' },
    { value: 'PREFIERO_NO_DECIRLO', label: 'Prefiero no decirlo' },
  ];

  form: FormGroup = this.fb.group({
    dateOfBirth: [null],
    gender:      [null],
    phoneNumber: ['', Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)],
    biography:   ['', Validators.maxLength(500)]
  });

  // Poblar el formulario cuando llega el perfil
  ngOnChanges(): void {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      dateOfBirth: p.fechaNacimiento ? new Date(p.fechaNacimiento) : null,
      gender:      p.genero      ?? null,
      biography:   p.biografia   ?? ''
    });
    if (p.avatarUrl) this.previewUrl.set(resolveMediaUrl(p.avatarUrl));
  }

  // ── Subida de avatar ───────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validación en el cliente antes de subir
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.toast.add({
        severity: 'warn',
        summary: 'Formato no permitido',
        detail: 'Usa una imagen JPEG, PNG o WebP.',
        life: 4000,
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.add({
        severity: 'warn',
        summary: 'Imagen muy grande',
        detail: 'La imagen no puede superar 5 MB.',
        life: 4000,
      });
      return;
    }

    // Preview inmediato
    const reader = new FileReader();
    reader.onload = e => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);

    // Subir al backend
    this.uploading.set(true);
    this.clearMessages();

    this.profileSvc.uploadAvatar(file).subscribe({
      next: res => {
        this.uploading.set(false);
        this.profileUpdated.emit(res.data);
        this.toast.add({
          severity: 'success',
          summary: 'Foto actualizada',
          detail: 'Tu foto de perfil se actualizó correctamente.',
          life: 3000,
        });
      },
      error: err => {
        this.uploading.set(false);
        this.previewUrl.set(resolveMediaUrl(this.profile()?.avatarUrl));
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo subir',
          detail: err?.error?.message ?? 'Error al subir la imagen.',
          life: 4000,
        });
      }
    });
  }

  // ── Guardar cambios personales ────────────────────────────

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.clearMessages();

    const v   = this.form.value;
    const dob = v.dateOfBirth
      ? (v.dateOfBirth as Date).toISOString().split('T')[0]
      : undefined;

    this.profileSvc.updateProfile({
      dateOfBirth: dob,
      gender:      v.gender      || undefined,
      biography:   v.biography   || undefined
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.profileUpdated.emit(res.data);
        this.showSuccess('Información personal guardada.');
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar.');
      }
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
