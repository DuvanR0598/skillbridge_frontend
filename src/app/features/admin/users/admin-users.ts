import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogModule } from 'primeng/dialog';
import { AdminUsersService } from './admin-users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserResponse } from '../../../core/models/auth.model';
import { CampusResponse, UsuarioPerfilResponse } from '../../../core/models/perfil.model';
import { MessageService } from 'primeng/api';
import { resolveMediaUrl } from '../../../core/utils/media-url';
import { AvatarViewer } from '../../../shared/components/avatar-viewer/avatar-viewer';

@Component({
  selector: 'app-admin-users',
  imports: [
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatButtonModule,
    MatTooltipModule,
    DialogModule,
    AvatarViewer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  private adminSvc = inject(AdminUsersService);
  private authSvc = inject(AuthService);
  private toast = inject(MessageService);

  loading = signal(true);
  saving = signal<number | null>(null);
  users = signal<UserResponse[]>([]);

  // ── Diálogo de perfil ───────────────────────────────────────────
  showProfileDialog = false;
  profileLoading = signal(false);
  selectedUser = signal<UserResponse | null>(null);
  selectedPerfil = signal<UsuarioPerfilResponse | null>(null);

  // ── Visor de foto a pantalla completa ───────────────────────────
  viewerUrl = signal<string | null>(null);
  viewerCaption = signal<string | null>(null);

  // Exportación a XLSX
  exporting = signal(false);

  columns = ['user', 'role', 'status', 'sede', 'actions'];

  roleOptions = [
    { value: 'ROLE_ESTUDIANTE', label: 'Estudiante' },
    { value: 'ROLE_COORDINADOR', label: 'Coordinador' },
    { value: 'ROLE_ADMIN', label: 'Administrador' },
  ];

  // ── Filtros y paginación (client-side) ─────────────────────
  searchText = signal('');
  filterRole = signal<string>('ALL');
  filterStatus = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  filterSede = signal<string>('ALL');
  campuses = signal<CampusResponse[]>([]);
  page = signal(0);
  pageSize = signal(10);

  /** Usuarios tras aplicar búsqueda (nombre/correo) y filtros de rol y estado. */
  filtered = computed(() => {
    const role = this.filterRole();
    const status = this.filterStatus();
    const text = this.searchText().trim().toLowerCase();
    return this.users().filter((u) => {
      const roleOk = role === 'ALL' || this.primaryRole(u) === role;
      const enabled = u.enabled !== false;
      const statusOk =
        status === 'ALL' || (status === 'ACTIVE' ? enabled : !enabled);
      const haystack = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''}`.toLowerCase();
      const textOk = !text || haystack.includes(text);
      const sede = this.filterSede();
      const sedeOk = sede === 'ALL' || u.sede === sede;
      return roleOk && statusOk && textOk && sedeOk;
    });
  });

  /** Página actual de los usuarios filtrados. */
  paged = computed(() => {
    const start = this.page() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadUsers();
    this.adminSvc.getCampuses().subscribe({
      next: (list) => this.campuses.set(list),
      error: () => this.campuses.set([]),
    });
  }

  onSearch(value: string): void {
    this.searchText.set(value);
    this.page.set(0);
  }

  onFilterRole(role: string): void {
    this.filterRole.set(role);
    this.page.set(0);
  }

  onFilterStatus(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.filterStatus.set(status);
    this.page.set(0);
  }

  onFilterSede(sede: string): void {
    this.filterSede.set(sede);
    this.page.set(0);
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.adminSvc.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los usuarios.',
          life: 4000,
        });
      },
    });
  }

  isSelf(u: UserResponse): boolean {
    return u.id === this.authSvc.currentUser()?.id;
  }

  /** Rol "principal" para mostrar en el selector (el de mayor jerarquía). */
  primaryRole(u: UserResponse): string {
    if (u.roles?.includes('ROLE_ADMIN')) return 'ROLE_ADMIN';
    if (u.roles?.includes('ROLE_COORDINADOR')) return 'ROLE_COORDINADOR';
    return 'ROLE_ESTUDIANTE';
  }

  initials(u: UserResponse): string {
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  avatarSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
  }

  /** Descarga la información de los usuarios en un archivo XLSX. */
  exportUsers(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.adminSvc.exportUsers().subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.add({
          severity: 'success',
          summary: 'Exportación lista',
          detail: 'El archivo de usuarios se descargó correctamente.',
          life: 3000,
        });
      },
      error: () => {
        this.exporting.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: 'Ocurrió un error al generar el archivo.',
          life: 4000,
        });
      },
    });
  }

  /** Abre el visor de foto a pantalla completa. */
  openAvatar(url: string | null | undefined, caption: string): void {
    const resolved = this.avatarSrc(url);
    if (!resolved) return;
    this.viewerCaption.set(caption);
    this.viewerUrl.set(resolved);
  }

  onChangeRole(u: UserResponse, role: string): void {
    if (role === this.primaryRole(u)) return; // sin cambios
    this.saving.set(u.id);
    this.adminSvc.updateRoles(u.id, [role]).subscribe({
      next: (updated) => {
        this.patchUser(updated);
        this.saving.set(null);
        this.toast.add({
          severity: 'success',
          summary: 'Rol actualizado',
          detail: `Se actualizó el rol de ${u.firstName} ${u.lastName}.`,
          life: 3000,
        });
      },
      error: (err) => {
        this.saving.set(null);
        // Forzar refresco del selector al valor real (revierte el cambio visual)
        this.users.update((list) => [...list]);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo actualizar el rol',
          detail: err?.error?.message ?? 'Ocurrió un error al actualizar el rol.',
          life: 4000,
        });
      },
    });
  }

  onToggleEnabled(u: UserResponse): void {
    this.saving.set(u.id);
    this.adminSvc.toggleEnabled(u.id).subscribe({
      next: () => {
        const ahoraActivo = !(u.enabled !== false);
        this.patchUser({ ...u, enabled: ahoraActivo });
        this.saving.set(null);
        this.toast.add({
          severity: 'success',
          summary: ahoraActivo ? 'Usuario habilitado' : 'Usuario deshabilitado',
          detail: `La cuenta de ${u.firstName} ${u.lastName} ahora está ${ahoraActivo ? 'activa' : 'inactiva'}.`,
          life: 3000,
        });
      },
      error: (err) => {
        this.saving.set(null);
        // Forzar refresco del toggle al valor real (revierte el cambio visual)
        this.users.update((list) => [...list]);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo cambiar el estado',
          detail: err?.error?.message ?? 'Ocurrió un error al actualizar el estado.',
          life: 4000,
        });
      },
    });
  }

  private patchUser(updated: UserResponse): void {
    this.users.update((list) => list.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  }

  openProfile(u: UserResponse): void {
    this.selectedUser.set(u);
    this.selectedPerfil.set(null);
    this.showProfileDialog = true;
    this.profileLoading.set(true);
    this.adminSvc.getUserPerfil(u.id).subscribe({
      next: (perfil) => {
        this.selectedPerfil.set(perfil);
        this.profileLoading.set(false);
      },
      error: () => {
        this.profileLoading.set(false);
        this.showProfileDialog = false;
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el perfil del usuario.',
          life: 4000,
        });
      },
    });
  }

  roleLabel(u: UserResponse): string {
    const role = this.primaryRole(u);
    if (role === 'ROLE_ADMIN') return 'Administrador';
    if (role === 'ROLE_COORDINADOR') return 'Coordinador';
    return 'Estudiante';
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }
}
