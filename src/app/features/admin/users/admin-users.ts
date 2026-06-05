import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminUsersService } from './admin-users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserResponse } from '../../../core/models/auth.model';

@Component({
  selector: 'app-admin-users',
  imports: [
    MatTableModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-users">
      <header class="admin-users__header">
        <h1>Administración de usuarios</h1>
        <p>Gestiona los roles y el estado de las cuentas del sistema.</p>
      </header>

      @if (loading()) {
        <div class="admin-users__loading"><mat-spinner diameter="36" /></div>
      } @else if (users().length === 0) {
        <p class="admin-users__empty">No hay usuarios para mostrar.</p>
      } @else {
        <div class="admin-users__table-wrap">
          <table mat-table [dataSource]="users()" class="admin-users__table">
            <!-- Usuario -->
            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef>Usuario</th>
              <td mat-cell *matCellDef="let u">
                <div class="user-cell">
                  <div class="user-avatar">
                    @if (u.avatarUrl) {
                      <img [src]="u.avatarUrl" [alt]="u.firstName" />
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

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" [class.is-self]="isSelf(row)"></tr>
          </table>
        </div>
        <p class="admin-users__hint">
          <mat-icon>info</mat-icon>
          No puedes cambiar tu propio rol ni desactivar tu cuenta.
        </p>
      }
    </section>
  `,
  styles: `
    .admin-users { max-width: 960px; margin: 2rem auto; padding: 0 1.5rem; }
    .admin-users__header { margin-bottom: 1.5rem; }
    .admin-users__header h1 { margin: 0 0 0.25rem; }
    .admin-users__header p { color: var(--text-secondary); margin: 0; }
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
  `,
})
export class AdminUsers implements OnInit {
  private adminSvc = inject(AdminUsersService);
  private authSvc = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  saving = signal<number | null>(null);
  users = signal<UserResponse[]>([]);

  columns = ['user', 'role', 'status'];

  roleOptions = [
    { value: 'ROLE_ESTUDIANTE', label: 'Estudiante' },
    { value: 'ROLE_COORDINADOR', label: 'Coordinador' },
    { value: 'ROLE_ADMIN', label: 'Administrador' },
  ];

  ngOnInit(): void {
    this.loadUsers();
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
        this.snackBar.open('No se pudieron cargar los usuarios.', 'Cerrar', { duration: 4000 });
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

  onChangeRole(u: UserResponse, role: string): void {
    if (role === this.primaryRole(u)) return; // sin cambios
    this.saving.set(u.id);
    this.adminSvc.updateRoles(u.id, [role]).subscribe({
      next: (updated) => {
        this.patchUser(updated);
        this.saving.set(null);
        this.snackBar.open(`Rol actualizado para ${u.firstName}.`, 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(null);
        // Forzar refresco del selector al valor real (revierte el cambio visual)
        this.users.update((list) => [...list]);
        this.snackBar.open(
          err?.error?.message ?? 'No se pudo actualizar el rol.',
          'Cerrar',
          { duration: 5000 },
        );
      },
    });
  }

  onToggleEnabled(u: UserResponse): void {
    this.saving.set(u.id);
    this.adminSvc.toggleEnabled(u.id).subscribe({
      next: () => {
        this.patchUser({ ...u, enabled: !(u.enabled !== false) });
        this.saving.set(null);
        this.snackBar.open(`Estado de ${u.firstName} actualizado.`, 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(null);
        // Forzar refresco del toggle al valor real (revierte el cambio visual)
        this.users.update((list) => [...list]);
        this.snackBar.open(
          err?.error?.message ?? 'No se pudo cambiar el estado.',
          'Cerrar',
          { duration: 5000 },
        );
      },
    });
  }

  private patchUser(updated: UserResponse): void {
    this.users.update((list) => list.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  }
}
