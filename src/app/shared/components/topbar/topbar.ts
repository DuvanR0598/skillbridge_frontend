import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../../core/auth/auth.service';
import { MatDividerModule } from '@angular/material/divider';
import { resolveMediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private authSvc = inject(AuthService);
  private router = inject(Router);

  pageTitle = input('Dashboard');
  sidebarOpen = input(true);
  toggleSidebar = output<void>();

  currentUser = this.authSvc.currentUser;

  getInitials(): string {
    const u = this.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  avatarSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
  }

  goToProfile(): void {
    this.router.navigate(['/app/profile']);
  }

  logout(): void {
    this.authSvc.logout();
  }
}
