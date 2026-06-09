import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { AssessmentService } from '../assessment.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { forkJoin, of, map, catchError } from 'rxjs';

interface ActiveSession {
  assessmentId: number;
  phase: string;
}

@Component({
  selector: 'app-assessment-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './assessment-list.html',
  styleUrl: './assessment-list.scss',
})
export class AssessmentList implements OnInit {

  private assessmentSvc = inject(AssessmentService);
  private authSvc       = inject(AuthService);
  private router        = inject(Router);

  loading        = signal(true);
  questionnaires = signal<any[]>([]);
  starting       = signal<number | null>(null);
  errorMsg       = signal<string | null>(null);

  // Sesiones EN_PROGRESO del estudiante, indexadas por idCuestionario
  activeSessions = signal<Map<number, ActiveSession>>(new Map());

  ngOnInit(): void {
    this.assessmentSvc.getPublishedQuestionnaires().subscribe({
      next: list => {
        this.questionnaires.set(list);
        this.loading.set(false);
        this.loadActiveSessions(list);
      },
      error: () => this.loading.set(false)
    });
  }

  /** Busca, por cada cuestionario, si el estudiante tiene una sesión en progreso. */
  private loadActiveSessions(list: any[]): void {
    const studentId = this.authSvc.currentUser()?.id;
    if (!studentId || list.length === 0) return;

    const calls = list.map(q =>
      this.assessmentSvc.getHistory(studentId, q.id).pipe(
        map(res => ({ qId: q.id, sessions: res.data ?? [] })),
        catchError(() => of({ qId: q.id, sessions: [] }))
      )
    );

    forkJoin(calls).subscribe(results => {
      const map = new Map<number, ActiveSession>();
      for (const r of results) {
        const active = r.sessions.find(s => s.estado === 'EN_PROGRESO');
        if (active) {
          map.set(r.qId, { assessmentId: active.id, phase: active.evaluacionFase });
        }
      }
      this.activeSessions.set(map);
    });
  }

  activeSession(questionnaireId: number): ActiveSession | null {
    return this.activeSessions().get(questionnaireId) ?? null;
  }

  /** Retoma la sesión en progreso navegando al player con su assessmentId. */
  resume(questionnaireId: number): void {
    const session = this.activeSession(questionnaireId);
    if (!session) return;
    this.router.navigate(['/app/assessment', questionnaireId, 'play'], {
      queryParams: { assessmentId: session.assessmentId }
    });
  }

  startAssessment(questionnaireId: number, phase: 'PRE_TEST' | 'POST_TEST'): void {
    this.starting.set(questionnaireId);
    this.errorMsg.set(null);

    this.assessmentSvc.startAssessment(questionnaireId, phase).subscribe({
      next: res => {
        const assessmentId = res.data.id;
        this.starting.set(null);
        this.router.navigate([
          '/app/assessment', questionnaireId, 'play'
        ], {
          queryParams: { assessmentId }
        });
      },
      error: err => {
        this.starting.set(null);
        this.errorMsg.set(
          err?.error?.message ?? 'No se pudo iniciar la evaluación.'
        );
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  formatDateTime(date: string | null): string {
    if (!date) return '';
    return new Date(date).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /** Estado de la ventana de disponibilidad para mostrar en la tarjeta. */
  availabilityStatus(q: any): 'open' | 'upcoming' | 'closed' {
    const now = new Date();
    if (q.fechaInicio && now < new Date(q.fechaInicio)) return 'upcoming';
    if (q.fechaFin && now > new Date(q.fechaFin)) return 'closed';
    return 'open';
  }

  isAvailable(q: any): boolean {
    return this.availabilityStatus(q) === 'open';
  }
}
