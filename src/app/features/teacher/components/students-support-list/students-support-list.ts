// components/students-support-list/students-support-list.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EstudianteQueNecesitaApoyoResponse } from '../../../../core/models/teacher-analytics.model';
import { skillMeta } from '../../../../core/models/dimension.model';

@Component({
  selector: 'app-students-support-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './students-support-list.html',
  styleUrl: './students-support-list.scss',
})
export class StudentsSupportList{
  students = input<EstudianteQueNecesitaApoyoResponse[]>([]);

  getSkillLabel(skill: string): string {
    return skillMeta(skill).shortCode;
  }

  getUrgencyClass(percentage: number): string {
    if (percentage <= 25) return 'urgency-high';
    if (percentage <= 40) return 'urgency-medium';
    return 'urgency-low';
  }
}
