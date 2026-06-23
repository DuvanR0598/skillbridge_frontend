import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, catchError, of } from 'rxjs';
import { TeacherAnalyticsService } from '../teacher-analytics.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CompletionStats,
  QuestionnaireSummary,
} from '../../../core/models/teacher-analytics.model';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private teacherSvc = inject(TeacherAnalyticsService);
  private authSvc = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  questionnaires = signal<any[]>([]);
  selectedQId = signal<number | null>(null);
  summary = signal<QuestionnaireSummary | null>(null);
  stats = signal<CompletionStats | null>(null);
  errorMsg = signal<string | null>(null);

  currentUser = this.authSvc.currentUser;
  isAdmin = computed(() => this.authSvc.isAdmin());

  ngOnInit(): void {
    this.teacherSvc.getPublishedQuestionnaires().subscribe({
      next: (res) => {
        // El backend devuelve estadoCuestionario ('PUBLICADO'/'ARCHIVADO')
        // y el id como idCuestionario; normalizamos a {id, name, status}.
        const published = (res.data ?? [])
          .filter(
            (q: any) =>
              q.estadoCuestionario === 'PUBLICADO' ||
              q.estadoCuestionario === 'ARCHIVADO',
          )
          .map((q: any) => ({
            id: q.idCuestionario,
            name: q.nombre,
            status: q.estadoCuestionario,
          }));
        this.questionnaires.set(published);
        if (published.length > 0) {
          // Restaurar el cuestionario que el coordinador estaba revisando
          // (query param), p. ej. al volver desde "Ver reporte completo del
          // grupo". Si no es válido, usar el primero.
          const fromUrl = Number(this.route.snapshot.queryParamMap.get('cuestionario'));
          const initialId = published.some((q: any) => q.id === fromUrl)
            ? fromUrl
            : published[0].id;
          this.selectedQId.set(initialId);
          this.syncUrl(initialId);
          this.loadData(initialId);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  onQuestionnaireChange(id: number): void {
    this.selectedQId.set(id);
    this.syncUrl(id);
    this.loadData(id);
  }

  /**
   * Refleja el cuestionario seleccionado en la URL (query param 'cuestionario')
   * para restaurarlo al volver desde el reporte del grupo.
   * replaceUrl evita ensuciar el historial del navegador.
   */
  private syncUrl(id: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cuestionario: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private loadData(qId: number): void {
    this.loading.set(true);
    forkJoin({
      summary: this.teacherSvc.getSummary(qId).pipe(catchError(() => of({ data: null }))),
      stats: this.teacherSvc.getCompletionStats(qId).pipe(catchError(() => of({ data: null }))),
    }).subscribe({
      next: ({ summary, stats }) => {
        this.summary.set(summary.data);
        this.stats.set(stats.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToGroupReport(): void {
    const qId = this.selectedQId();
    if (qId) {
      this.router.navigate(['/app/teacher/group-report', qId]);
    }
  }

  goToQuestionnaires(): void {
    this.router.navigate(['/app/questionnaires']);
  }

  formatPct(val: number | null | undefined): string {
    return val != null ? val.toFixed(1) + '%' : '—';
  }

  formatDelta(val: number | null | undefined): string {
    if (val == null) return '—';
    return (val > 0 ? '+' : '') + val.toFixed(1) + '%';
  }

  getDeltaClass(val: number | null | undefined): string {
    if (val == null) return '';
    return val > 0 ? 'positive' : val < 0 ? 'negative' : '';
  }
}
