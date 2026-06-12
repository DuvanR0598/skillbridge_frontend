// group-report/group-report.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { forkJoin, catchError, of } from 'rxjs';
import { TeacherAnalyticsService } from '../teacher-analytics.service';
import { ReporteGrupoResponse, EstudianteQueNecesitaApoyoResponse } from '../../../core/models/teacher-analytics.model';
import { LevelDistributionChart } from '../components/level-distribution-chart/level-distribution-chart';
import { DimensionAnalysisTable } from '../components/dimension-analysis-table/dimension-analysis-table';
import { StudentsSupportList} from '../components/students-support-list/students-support-list';

@Component({
  selector: 'app-group-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    LevelDistributionChart,
    DimensionAnalysisTable,
    StudentsSupportList,
  ],
  templateUrl: './group-report.html',
  styleUrl: './group-report.scss',
})
export class GroupReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private teacherSvc = inject(TeacherAnalyticsService);

  loading = signal(true);
  report = signal<ReporteGrupoResponse | null>(null);
  needingSupport = signal<EstudianteQueNecesitaApoyoResponse[]>([]);
  errorMsg = signal<string | null>(null);
  questionnaireId = 0;

  ngOnInit(): void {
    this.questionnaireId = Number(this.route.snapshot.paramMap.get('questionnaireId'));

    forkJoin({
      report: this.teacherSvc
        .getGroupReport(this.questionnaireId)
        .pipe(catchError(() => of({ data: null }))),
      support: this.teacherSvc
        .getStudentsNeedingSupport(this.questionnaireId)
        .pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ report, support }) => {
        this.report.set(report.data);
        this.needingSupport.set(support.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el reporte.');
        this.loading.set(false);
      },
    });
  }

  formatPct(val: number | null): string {
    return val != null ? val.toFixed(1) + '%' : '—';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;

    const rows = [
      ['Cuestionario', r.nombreCuestionario],
      ['Generado el', this.formatDate(r.generatedAt)],
      [],
      ['Skill', 'Dimensión', 'PRE avg', 'POST avg', 'Delta', 'Mejoraron %'],
      ...r.analisiDimensional.map((a) => [
        a.skill,
        a.dimensionNombre ?? 'Global',
        a.avgPrePorcentaje.toFixed(1),
        a.avgPostPorcentaje.toFixed(1),
        a.avgDelta.toFixed(1),
        a.totalEstudiantes > 0
          ? ((a.estudiantesMejorados / a.totalEstudiantes) * 100).toFixed(0) + '%'
          : '—',
      ]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-grupo-${this.questionnaireId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
