// components/dimension-analysis-table/dimension-analysis-table.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AnalisisDimensionalResponse } from '../../../../core/models/teacher-analytics.model';
import { skillMeta } from '../../../../core/models/dimension.model';

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
    return skillMeta(skill).shortCode;
  }

  getDeltaClass(delta: number): string {
    return delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
  }

  getImprovePct(a: AnalisisDimensionalResponse): number {
    if (!a.totalEstudiantes) return 0;
    return Math.round((a.estudiantesMejorados / a.totalEstudiantes) * 100);
  }
}
