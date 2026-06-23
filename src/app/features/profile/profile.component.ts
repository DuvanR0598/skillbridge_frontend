import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, catchError, of } from 'rxjs';
import { ProfileService } from './profile.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  EngineeringProgramResponse,
  ProfileStatusResponse,
  UsuarioPerfilResponse,
} from '../../core/models/perfil.model';
import { resolveMediaUrl } from '../../core/utils/media-url';
import { AvatarViewer } from '../../shared/components/avatar-viewer/avatar-viewer';
import { ProfileInfo } from './components/profile-info/profile-info';
import { ProfileAcademic } from './components/profile-academic/profile-academic';
import { ProfileSecurity } from './components/profile-security/profile-security';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    ProfileInfo,
    ProfileAcademic,
    ProfileSecurity,
    AvatarViewer,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private authSvc = inject(AuthService);

  loading = signal(true);
  profile = signal<UsuarioPerfilResponse | null>(null);
  status = signal<ProfileStatusResponse | null>(null);
  programs = signal<EngineeringProgramResponse[]>([]);

  currentUser = this.authSvc.currentUser;

  // URL de la foto en el visor a pantalla completa (null = cerrado)
  viewerUrl = signal<string | null>(null);

  /** Abre el visor con la foto de perfil actual. */
  openAvatar(): void {
    const url = this.avatarSrc(this.profile()?.avatarUrl);
    if (url) this.viewerUrl.set(url);
  }

  ngOnInit(): void {
    forkJoin({
      profile: this.profileSvc.getMyProfile().pipe(catchError(() => of({ data: null }))),
      status: this.profileSvc.getProfileStatus().pipe(catchError(() => of({ data: null }))),
      programs: this.profileSvc.getPrograms().pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ profile, status, programs }) => {
        this.profile.set(profile.data);
        this.status.set(status.data);
        this.programs.set(programs.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // Los subcomponentes emiten cuando actualizan el perfil
  onProfileUpdated(updated: UsuarioPerfilResponse): void {
    this.profile.set(updated);

    // Recalcular el status
    this.profileSvc.getProfileStatus().subscribe({
      next: (res) => this.status.set(res.data),
    });

    // Sincronizar el usuario en AuthService si cambió el avatar, para que el
    // sidebar y la topbar (que leen currentUser) se actualicen al instante.
    const current = this.currentUser();
    if (current && updated.avatarUrl !== current.avatarUrl) {
      this.authSvc.updateCurrentUser({ avatarUrl: updated.avatarUrl });
    }
  }

  /** Resuelve la URL del avatar a absoluta (prefija el origen del backend si es relativa). */
  avatarSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
  }

  getInitials(): string {
    const u = this.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  getRoleLabel(): string {
    const roles = this.authSvc.userRoles();
    if (roles.includes('ROLE_ADMIN')) return 'Administrador';
    if (roles.includes('ROLE_TEACHER')) return 'Docente';
    return 'Estudiante';
  }

  getRoleClass(): string {
    const roles = this.authSvc.userRoles();
    if (roles.includes('ROLE_ADMIN')) return 'role-admin';
    if (roles.includes('ROLE_TEACHER')) return 'role-teacher';
    return 'role-student';
  }
}
