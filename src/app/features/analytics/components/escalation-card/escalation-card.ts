import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DecisionEscala, SkillProgresoResponse } from '../../../../core/models/analytics.model';
import { skillMeta } from '../../../../core/models/dimension.model';

@Component({
  selector: 'app-escalation-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './escalation-card.html',
  styleUrl: './escalation-card.scss',
})
export class EscalationCard {
  decision = input<DecisionEscala>('PENDIENTE');
  reason = input('');
  achievedDimensions = input<SkillProgresoResponse[]>([]);
  pendingDimensions = input<SkillProgresoResponse[]>([]);

  getIcon(): string {
    const m: Record<DecisionEscala, string> = {
      CERTIFICAR: 'workspace_premium',
      REINICIAR: 'refresh',
      PENDIENTE: 'hourglass_empty',
    };
    return m[this.decision()];
  }

  getTitle(): string {
    const m: Record<DecisionEscala, string> = {
      CERTIFICAR: '¡Certificación disponible!',
      REINICIAR: 'Continuar el proceso de desarrollo',
      PENDIENTE: 'Evaluación en progreso',
    };
    return m[this.decision()];
  }

  getDimLabel(s: SkillProgresoResponse): string {
    const skill = skillMeta(s.skill).shortCode;
    const dim = s.dimensionNombre ?? '';
    return dim ? `${skill} · ${dim}` : skill;
  }
}
