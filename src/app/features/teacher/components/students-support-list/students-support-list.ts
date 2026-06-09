// components/students-support-list/students-support-list.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EstudianteQueNecesitaApoyoResponse } from '../../../../core/models/teacher-analytics.model';

@Component({
  selector: 'app-students-support-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './students-support-list.html',
  styleUrl: './students-support-list.scss',
})
export class StudentsSupportList{
  students = input<EstudianteQueNecesitaApoyoResponse[]>([]);

  getDimLabel(dim: string | null): string {
    const m: Record<string, string> = {
      INTERPRETACION: 'Interpretación',
      INFERENCIA: 'Inferencia',
      GESTION_DEL_CAMBIO: 'G. Cambio',
      GESTION_DE_INCERTIDUMBRE: 'Incertidumbre',
      ANALISIS: 'Análisis',
      EVALUACION: 'Evaluación',
      EXPLICACION: 'Explicación',
      AUTORREGULACION: 'Autorregulación',
    };
    return dim ? (m[dim] ?? dim) : 'Global';
  }

  getSkillLabel(skill: string): string {
    return skill === 'PENSAMIENTO_CRITICO' ? 'PC' : 'AD';
  }

  getUrgencyClass(percentage: number): string {
    if (percentage <= 25) return 'urgency-high';
    if (percentage <= 40) return 'urgency-medium';
    return 'urgency-low';
  }
}
