// components/dimension-analysis-table/dimension-analysis-table.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AnalisisDimensionalResponse } from '../../../../core/models/teacher-analytics.model';

@Component({
  selector: 'app-dimension-analysis-table',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './dimension-analysis-table.html',
  styleUrl: './dimension-analysis-table.scss',
})
export class DimensionAnalysisTable {
  analyses = input<AnalisisDimensionalResponse[]>([]);

  getSkillLabel(skill: string): string {
    return skill === 'CRITICAL_THINKING' ? 'PC' : 'AD';
  }

  getDimLabel(dim: string | null): string {
    const m: Record<string, string> = {
      INTERPRETACION: 'Interpretación',
      INFERENCIA: 'Inferencia',
      ANALISIS: 'Análisis',
      EVALUACION: 'Evaluación',
      EXPLICACION: 'Explicación',
      AUTORREGULACION: 'Autorregulación',
      GESTION_DEL_CAMBIO: 'G. Cambio',
      GESTION_DE_INCERTIDUMBRE: 'Incertidumbre',
    };
    return dim ? (m[dim] ?? dim) : 'Global';
  }

  getDeltaClass(delta: number): string {
    return delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
  }

  getImprovePct(a: AnalisisDimensionalResponse): number {
    if (!a.totalEstudiantes) return 0;
    return Math.round((a.estudiantesMejorados / a.totalEstudiantes) * 100);
  }
}
