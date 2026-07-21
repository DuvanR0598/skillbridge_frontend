import { CommonModule } from '@angular/common';
import { skillMeta } from '../../../core/models/dimension.model';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { AssessmentService } from '../assessment.service';
import { InformeEvaluacionResponse } from '../../../core/models/assessment.model';

@Component({
  selector: 'app-assessment-result',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
  ],
  templateUrl: './assessment-result.html',
  styleUrl: './assessment-result.scss',
})
export class AssessmentResult implements OnInit {

  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private assessmentSvc = inject(AssessmentService);

  loading    = signal(true);
  report     = signal<InformeEvaluacionResponse | null>(null);
  errorMsg   = signal<string | null>(null);

  ngOnInit(): void {
    const assessmentId = Number(this.route.snapshot.paramMap.get('assessmentId'));

    this.assessmentSvc.getReport(assessmentId).subscribe({
      next: res => {
        this.report.set(res.data);
        this.loading.set(false);
      },
      error: err => {
        this.errorMsg.set(
          err?.error?.message ?? 'No se pudo cargar el reporte.'
        );
        this.loading.set(false);
      }
    });
  }

  getLevelClass(level: string | null): string {
    const map: Record<string, string> = {
      BAJO:       'level-basic',
      INTERMEDIO: 'level-intermediate',
      AVANZADO:   'level-advanced'
    };
    return level ? (map[level] ?? '') : '';
  }

  getLevelLabel(level: string | null): string {
    const map: Record<string, string> = {
      BAJO:       'Bajo',
      INTERMEDIO: 'Intermedio',
      AVANZADO:   'Avanzado'
    };
    return level ? (map[level] ?? 'Sin nivel') : 'Sin nivel';
  }

  getSkillLabel(skill: string): string {
    return skillMeta(skill).label;
  }

  getPlanAxisLabel(axis: string): string {
    const map: Record<string, string> = {
      ACADEMICO:    'Académico',
      EXPERIMENTAL: 'Experimental',
      PERSONAL:     'Personal'
    };
    return map[axis] ?? axis;
  }

  getPlanAxisClass(axis: string): string {
    const map: Record<string, string> = {
      ACADEMICO:    'axis-academic',
      EXPERIMENTAL: 'axis-experiential',
      PERSONAL:     'axis-personal'
    };
    return map[axis] ?? '';
  }

  getActionIcon(actionType: string): string {
    const map: Record<string, string> = {
      LEER:      'menu_book',
      VER:       'play_circle',
      PRACTICAR: 'fitness_center'
    };
    return map[actionType] ?? 'link';
  }

  isAllAdvanced(): boolean {
    const r = this.report();
    if (!r || r.resultados.length === 0) return false;
    return r.resultados.every(res => res.nivel === 'AVANZADO');
  }

  goToProgress(): void {
    this.router.navigate(['/app/analytics']);
  }

  /** Genera el PDF del reporte de la evaluación vía el diálogo de impresión del navegador. */
  exportPdf(): void {
    document.body.classList.add('print-result');
    window.print();
    document.body.classList.remove('print-result');
  }
}
