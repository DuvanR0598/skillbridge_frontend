import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SkillProgresoResponse } from '../../../../core/models/analytics.model';

@Component({
  selector: 'app-progress-comparison',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './progress-comparison.html',
  styleUrl: './progress-comparison.scss',
})
export class ProgressComparison {
  skills = input<SkillProgresoResponse[]>([]);

  getLevelLabel(level: string | null): string {
    const m: Record<string, string> = {
      BAJO: 'bajo',
      INTERMEDIO: 'Intermedio',
      AVANZADO: 'Avanzado',
    };
    return level ? (m[level] ?? '—') : '—';
  }

  getLevelClass(level: string | null): string {
    const m: Record<string, string> = {
      BAJO: 'Nivel-bajo',
      INTERMEDIO: 'Nivel-intermedio',
      AVANZADO: 'Nivel-avanzado',
    };
    return level ? (m[level] ?? '') : '';
  }

  getSkillLabel(skill: string): string {
    return skill === 'PENSAMIENTO_CRITICO' ? 'Pensamiento Crítico' : 'Adaptabilidad';
  }

  getDimLabel(dim: string | null): string {
    const m: Record<string, string> = {
      INTERPRETACION: 'Interpretación',
      INFERENCIA: 'Inferencia',
      ANALISIS: 'Análisis',
      EVALUACION: 'Evaluación',
      EXPLICACION: 'Explicación',
      AUTORREGULACION: 'Autorregulación',
      GESTION_DEL_CAMBIO: 'Gestión del cambio',
      GESTION_DE_INCERTIDUMBRE: 'Gestión de la incertidumbre',
    };
    return dim ? (m[dim] ?? dim) : 'Global';
  }

  getDeltaClass(delta: number | null): string {
    if (delta === null) return '';
    return delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : 'delta-neutral';
  }

  getDeltaIcon(delta: number | null): string {
    if (delta === null) return 'remove';
    return delta > 0 ? 'arrow_upward' : delta < 0 ? 'arrow_downward' : 'remove';
  }
}
