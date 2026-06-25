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
import { UsuarioPerfilResponse } from '../../../core/models/perfil.model';
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
  template: `
    <section class="admin-users">
      <header class="admin-users__header">
        <div>
          <h1>Administración de usuarios</h1>
          <p>Gestiona los roles y el estado de las cuentas del sistema.</p>
        </div>
        <button
          mat-flat-button
          class="btn-action-primary btn-export"
          [disabled]="exporting()"
          (click)="exportUsers()"
        >
          @if (exporting()) {
            <mat-spinner diameter="18" />
          } @else {
            <mat-icon>download</mat-icon>
          }
          Exportar XLSX
        </button>
      </header>

      @if (!loading() && users().length > 0) {
        <div class="admin-users__filters">
          <div class="users-search">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              class="search-input"
              type="text"
              placeholder="Buscar por nombre o correo..."
              [value]="searchText()"
              (input)="onSearch($any($event.target).value)"
            />
            @if (searchText()) {
              <button type="button" class="search-clear" (click)="onSearch('')" aria-label="Limpiar búsqueda">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Rol</mat-label>
            <mat-select [value]="filterRole()" (selectionChange)="onFilterRole($event.value)">
              <mat-option value="ALL">Todos los roles</mat-option>
              @for (r of roleOptions; track r.value) {
                <mat-option [value]="r.value">{{ r.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Estado</mat-label>
            <mat-select [value]="filterStatus()" (selectionChange)="onFilterStatus($event.value)">
              <mat-option value="ALL">Todos</mat-option>
              <mat-option value="ACTIVE">Activos</mat-option>
              <mat-option value="INACTIVE">Inactivos</mat-option>
            </mat-select>
          </mat-form-field>

          <span class="filter-count">{{ filtered().length }} usuario(s)</span>
        </div>
      }

      @if (loading()) {
        <div class="admin-users__loading"><mat-spinner diameter="36" /></div>
      } @else if (users().length === 0) {
        <p class="admin-users__empty">No hay usuarios para mostrar.</p>
      } @else if (filtered().length === 0) {
        <p class="admin-users__empty">Ningún usuario coincide con los filtros.</p>
      } @else {
        <div class="admin-users__table-wrap">
          <table mat-table [dataSource]="paged()" class="admin-users__table">
            <!-- Usuario -->
            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef>Usuario</th>
              <td mat-cell *matCellDef="let u">
                <div class="user-cell">
                  <div class="user-avatar">
                    @if (u.avatarUrl) {
                      <img
                        [src]="avatarSrc(u.avatarUrl)"
                        [alt]="u.firstName"
                        class="clickable-avatar"
                        matTooltip="Ver foto"
                        (click)="openAvatar(u.avatarUrl, u.firstName + ' ' + u.lastName)"
                      />
                    } @else {
                      <span>{{ initials(u) }}</span>
                    }
                  </div>
                  <div class="user-meta">
                    <span class="user-name">{{ u.firstName }} {{ u.lastName }}</span>
                    <span class="user-email">{{ u.email }}</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Rol -->
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Rol</th>
              <td mat-cell *matCellDef="let u">
                <mat-select
                  [value]="primaryRole(u)"
                  [disabled]="saving() === u.id || isSelf(u)"
                  (selectionChange)="onChangeRole(u, $event.value)"
                  panelClass="role-panel"
                >
                  @for (r of roleOptions; track r.value) {
                    <mat-option [value]="r.value">{{ r.label }}</mat-option>
                  }
                </mat-select>
              </td>
            </ng-container>

            <!-- Estado -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let u">
                <mat-slide-toggle
                  [checked]="u.enabled !== false"
                  [disabled]="saving() === u.id || isSelf(u)"
                  (change)="onToggleEnabled(u)"
                >
                  {{ u.enabled !== false ? 'Activo' : 'Inactivo' }}
                </mat-slide-toggle>
              </td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let u">
                <button mat-icon-button
                        class="action-btn"
                        matTooltip="Ver perfil"
                        aria-label="Ver perfil"
                        (click)="openProfile(u)">
                  <mat-icon>person</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" [class.is-self]="isSelf(row)"></tr>
          </table>
        </div>

        <mat-paginator
          class="admin-users__paginator"
          [length]="filtered().length"
          [pageSize]="pageSize()"
          [pageIndex]="page()"
          [pageSizeOptions]="[5, 10, 20, 50]"
          (page)="onPage($event)"
          aria-label="Paginación de usuarios"
        />

        <p class="admin-users__hint">
          <mat-icon>info</mat-icon>
          No puedes cambiar tu propio rol ni desactivar tu cuenta.
        </p>
      }
    </section>

    <!-- Diálogo: perfil del usuario -->
    <p-dialog
      [(visible)]="showProfileDialog"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '480px' }"
      maskStyleClass="bank-dialog-mask"
    >
      <ng-template pTemplate="header">
        <span class="profile-dlg__title">Perfil del usuario</span>
      </ng-template>

      @if (profileLoading()) {
        <div class="profile-dlg__loading">
          <mat-spinner diameter="32" />
        </div>
      } @else if (selectedUser() && selectedPerfil()) {
        <div class="profile-dlg__body">
          <!-- Avatar + nombre -->
          <div class="profile-dlg__hero">
            <div class="profile-dlg__avatar">
              @if (selectedPerfil()!.avatarUrl) {
                <img
                  [src]="avatarSrc(selectedPerfil()!.avatarUrl)"
                  [alt]="selectedUser()!.firstName"
                  class="clickable-avatar"
                  matTooltip="Ver foto"
                  (click)="openAvatar(selectedPerfil()!.avatarUrl, selectedUser()!.firstName + ' ' + selectedUser()!.lastName)"
                />
              } @else {
                <span>{{ initials(selectedUser()!) }}</span>
              }
            </div>
            <div class="profile-dlg__identity">
              <p class="profile-dlg__name">{{ selectedUser()!.firstName }} {{ selectedUser()!.lastName }}</p>
              <p class="profile-dlg__email">{{ selectedUser()!.email }}</p>
              <span class="profile-dlg__role-badge">{{ roleLabel(selectedUser()!) }}</span>
            </div>
          </div>

          <!-- Barra de completitud -->
          <div class="profile-dlg__completion">
            <div class="completion-header">
              <span class="completion-label">Completitud del perfil</span>
              <span class="completion-pct">{{ selectedPerfil()!.porcentajeCompleto }}%</span>
            </div>
            <div class="completion-bar">
              <div class="completion-fill"
                   [style.width.%]="selectedPerfil()!.porcentajeCompleto"></div>
            </div>
          </div>

          <!-- Datos personales -->
          <div class="profile-dlg__section">
            <p class="profile-dlg__section-title">Información personal</p>
            <div class="profile-dlg__rows">
              <div class="profile-dlg__row">
                <mat-icon>badge</mat-icon>
                <span class="row-label">Tipo de identificación</span>
                <span class="row-val">{{ selectedUser()!.visualizacionTipoIdentificacion ?? selectedUser()!.tipoIdentificacion ?? '—' }}</span>
              </div>
              <div class="profile-dlg__row">
                <mat-icon>fingerprint</mat-icon>
                <span class="row-label">N° de identificación</span>
                <span class="row-val">{{ selectedUser()!.numeroIdentificacion ?? '—' }}</span>
              </div>
              <div class="profile-dlg__row">
                <mat-icon>cake</mat-icon>
                <span class="row-label">Fecha de nacimiento</span>
                <span class="row-val">{{ selectedPerfil()!.fechaNacimiento ? formatDate(selectedPerfil()!.fechaNacimiento!) : '—' }}</span>
              </div>
              <div class="profile-dlg__row">
                <mat-icon>wc</mat-icon>
                <span class="row-label">Género</span>
                <span class="row-val">{{ selectedPerfil()!.visualizacionGenero ?? '—' }}</span>
              </div>
              <div class="profile-dlg__row biography-row">
                <mat-icon>notes</mat-icon>
                <span class="row-label">Biografía</span>
                <span class="row-val biography-val">{{ selectedPerfil()!.biografia || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Datos académicos -->
          <div class="profile-dlg__section">
            <p class="profile-dlg__section-title">Información académica</p>
            <div class="profile-dlg__rows">
              <div class="profile-dlg__row">
                <mat-icon>school</mat-icon>
                <span class="row-label">Programa</span>
                <span class="row-val">{{ selectedPerfil()!.visualizacionProgramaIngenieria ?? '—' }}</span>
              </div>
              <div class="profile-dlg__row">
                <mat-icon>badge</mat-icon>
                <span class="row-label">Código Programa</span>
                <span class="row-val">{{ selectedPerfil()!.codigoProgramaIngenieria ?? '—' }}</span>
              </div>
              <div class="profile-dlg__row">
                <mat-icon>class</mat-icon>
                <span class="row-label">Semestre</span>
                <span class="row-val">{{ selectedPerfil()!.semestreAcademico ? 'Semestre ' + selectedPerfil()!.semestreAcademico : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      }
    </p-dialog>

    <!-- Visor de foto a pantalla completa -->
    <app-avatar-viewer
      [imageUrl]="viewerUrl()"
      [caption]="viewerCaption()"
      (closed)="viewerUrl.set(null)"
    />
  `,
  styles: `
    .admin-users { max-width: 960px; margin: 2rem auto; padding: 0 1.5rem; }
    .clickable-avatar { cursor: zoom-in; }
    .admin-users__header {
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .admin-users__header h1 { margin: 0 0 0.25rem; }
    .admin-users__header p { color: var(--text-secondary); margin: 0; }
    .btn-export { flex-shrink: 0; }
    .admin-users__filters {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .filter-field { width: 200px; }
    .filter-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .users-search {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0 12px;
      flex: 1;
      min-width: 220px;
      height: 48px;
    }
    .users-search .search-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); }
    .users-search .search-input {
      flex: 1; border: none; background: none; outline: none;
      font-size: 14px; color: var(--text-primary); font-family: inherit; padding: 10px 0;
    }
    .users-search .search-input::placeholder { color: var(--text-secondary); }
    .users-search .search-clear {
      display: flex; align-items: center; border: none; background: none; cursor: pointer;
      color: var(--text-secondary); padding: 2px;
    }
    .users-search .search-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .filter-count { color: var(--text-secondary); font-size: 0.85rem; margin-left: auto; }
    .admin-users__paginator { background: transparent; margin-top: 0.5rem; }
    .admin-users__loading { display: flex; justify-content: center; padding: 3rem 0; }
    .admin-users__empty { color: var(--text-secondary); }
    .admin-users__table-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .admin-users__table { width: 100%; }
    .user-cell { display: flex; align-items: center; gap: 0.75rem; padding: 0.25rem 0; }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%; overflow: hidden;
      background: var(--primary); color: #fff; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 600;
    }
    .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .user-meta { display: flex; flex-direction: column; }
    .user-name { font-weight: 500; }
    .user-email { font-size: 0.8rem; color: var(--text-secondary); }
    .is-self { background: rgba(0, 0, 0, 0.02); }
    .admin-users__hint {
      display: flex; align-items: center; gap: 0.4rem;
      color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.75rem;
    }
    .admin-users__hint mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .action-btn { color: var(--text-secondary); }
    .action-btn:hover { color: var(--primary); }

    /* ── Diálogo de perfil ─────────────────────────────────────────── */
    .profile-dlg__title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .profile-dlg__loading {
      display: flex; justify-content: center; align-items: center; padding: 2rem 0;
    }
    .profile-dlg__body { display: flex; flex-direction: column; gap: 20px; }

    .profile-dlg__hero { display: flex; align-items: center; gap: 16px; }
    .profile-dlg__avatar {
      width: 64px; height: 64px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
      background: var(--primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 700;
    }
    .profile-dlg__avatar img { width: 100%; height: 100%; object-fit: cover; }
    .profile-dlg__identity { display: flex; flex-direction: column; gap: 4px; }
    .profile-dlg__name { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .profile-dlg__email { font-size: 13px; color: var(--text-secondary); margin: 0; }
    .profile-dlg__role-badge {
      display: inline-block; padding: 2px 10px; border-radius: 999px;
      background: rgba(26,92,56,.12); color: var(--primary);
      font-size: 12px; font-weight: 600;
    }

    .profile-dlg__completion { display: flex; flex-direction: column; gap: 6px; }
    .completion-header { display: flex; justify-content: space-between; font-size: 13px; }
    .completion-label { color: var(--text-secondary); }
    .completion-pct { font-weight: 600; color: var(--primary); }
    .completion-bar {
      height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;
    }
    .completion-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width .3s; }

    .profile-dlg__section { display: flex; flex-direction: column; gap: 8px; }
    .profile-dlg__section-title {
      font-size: 12px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .05em; color: var(--text-secondary); margin: 0;
    }
    .profile-dlg__rows { display: flex; flex-direction: column; gap: 2px; }
    .profile-dlg__row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 8px 10px; border-radius: var(--radius-sm);
      font-size: 14px;
    }
    .profile-dlg__row:hover { background: var(--bg-app); }
    .profile-dlg__row mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); flex-shrink: 0; margin-top: 1px; }
    .row-label { color: var(--text-secondary); min-width: 140px; flex-shrink: 0; }
    .row-val { color: var(--text-primary); font-weight: 500; }
    .biography-row { align-items: flex-start; }
    .biography-val { white-space: pre-wrap; line-height: 1.5; }
  `,
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

  columns = ['user', 'role', 'status', 'actions'];

  roleOptions = [
    { value: 'ROLE_ESTUDIANTE', label: 'Estudiante' },
    { value: 'ROLE_COORDINADOR', label: 'Coordinador' },
    { value: 'ROLE_ADMIN', label: 'Administrador' },
  ];

  // ── Filtros y paginación (client-side) ─────────────────────
  searchText = signal('');
  filterRole = signal<string>('ALL');
  filterStatus = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
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
      return roleOk && statusOk && textOk;
    });
  });

  /** Página actual de los usuarios filtrados. */
  paged = computed(() => {
    const start = this.page() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadUsers();
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
