import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dashboard">
      <h1>Bienvenido{{ userName() ? ', ' + userName() : '' }} 👋</h1>
      <p>Tu sesión está activa. El dashboard completo está en construcción.</p>
      <button mat-flat-button (click)="logout()">Cerrar sesión</button>
    </section>
  `,
  styles: `
    .dashboard {
      max-width: 720px;
      margin: 3rem auto;
      padding: 2rem;
      text-align: center;
    }
    h1 { margin-bottom: 0.5rem; }
    p  { color: var(--text-secondary); margin-bottom: 1.5rem; }
  `,
})
export class Dashboard {
  private authSvc = inject(AuthService);

  userName = () => this.authSvc.currentUser()?.firstName ?? '';

  logout(): void {
    this.authSvc.logout();
  }
}
