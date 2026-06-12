// components/skill-radar-chart/skill-radar-chart.component.ts
import { Component, input, OnChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { SkillProgresoResponse } from '../../../../core/models/analytics.model';

@Component({
  selector: 'app-skill-radar-chart',
  standalone: true,
  template: `
    <div class="radar-wrap">
      <canvas #canvas width="280" height="280"></canvas>
    </div>
  `,
  styleUrl: './skill-radar-chart.scss',
})
export class SkillRadarChartComponent implements OnChanges, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  skills = input<SkillProgresoResponse[]>([]);

  private drawn = false;

  ngAfterViewInit(): void {
    this.drawn = true;
    this.draw();
  }

  ngOnChanges(): void {
    if (this.drawn) this.draw();
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const data = this.skills();
    if (!data.length) return;

    const cx = 140,
      cy = 140,
      r = 100;
    ctx.clearRect(0, 0, 280, 280);

    const labels = data.map((s) =>
      s.dimensionNombre ? this.shortLabel(s.dimensionNombre) : this.shortSkill(s.skill),
    );
    const preVals = data.map((s) => (s.prePorcentaje ?? 0) / 100);
    const postVals = data.map((s) => (s.postPorcentaje ?? 0) / 100);
    const n = labels.length;

    const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pt = (i: number, val: number) => ({
      x: cx + Math.cos(angle(i)) * r * val,
      y: cy + Math.sin(angle(i)) * r * val,
    });

    // Anillos de fondo
    ctx.strokeStyle = 'rgba(128,128,128,.15)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach((scale) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = {
          x: cx + Math.cos(angle(i)) * r * scale,
          y: cy + Math.sin(angle(i)) * r * scale,
        };
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // Ejes
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const p = { x: cx + Math.cos(angle(i)) * r, y: cy + Math.sin(angle(i)) * r };
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(128,128,128,.2)';
      ctx.stroke();
    }

    // Área PRE (azul)
    if (preVals.some((v) => v > 0)) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pt(i, preVals[i]);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(59,130,246,.15)';
      ctx.strokeStyle = 'rgba(59,130,246,.7)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    // Área POST (verde)
    if (postVals.some((v) => v > 0)) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pt(i, postVals[i]);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(16,185,129,.15)';
      ctx.strokeStyle = 'rgba(16,185,129,.8)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    // Etiquetas
    ctx.fillStyle =
      getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#6B7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const lx = cx + Math.cos(angle(i)) * (r + 20);
      const ly = cy + Math.sin(angle(i)) * (r + 20);
      ctx.fillText(labels[i], lx, ly + 4);
    }
  }

  private shortLabel(dim: string): string {
    const map: Record<string, string> = {
      INTERPRETACION: 'Interpret.',
      INFERENCIA: 'Inferencia',
      ANALISIS: 'Análisis',
      EVALUACION: 'Evaluación',
      EXPLICACION: 'Explic.',
      AUTORREGULACION: 'Auto-reg.',
      GESTION_DEL_CAMBIO: 'G. Cambio',
      GESTION_DE_INCERTIDUMBRE: 'Incert.',
    };
    return map[dim] ?? dim;
  }

  private shortSkill(skill: string): string {
    return skill === 'PENSAMIENTO_CRITICO' ? 'PC' : 'AD';
  }
}
