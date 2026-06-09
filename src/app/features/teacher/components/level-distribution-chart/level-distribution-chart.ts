// components/level-distribution-chart/level-distribution-chart.component.ts
import { Component, input, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DistribucionNivelesResponse } from '../../../../core/models/teacher-analytics.model';

@Component({
  selector: 'app-level-distribution-chart',
  standalone: true,
  template: `
    <div class="chart-wrap">
      <canvas #canvas height="180"></canvas>
    </div>
  `,
  styleUrl: './level-distribution-chart.scss',
})
export class LevelDistributionChart implements OnChanges, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  pre = input<DistribucionNivelesResponse | null>(null);
  post = input<DistribucionNivelesResponse | null>(null);

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
    const W = canvas.offsetWidth || 300;
    canvas.width = W;

    ctx.clearRect(0, 0, W, 180);

    const preD = this.pre();
    const postD = this.post();
    if (!preD && !postD) return;

    // Colores para cada nivel
    const colors: Record<string, string> = {
      basic: '#EF4444',
      intermediate: '#F59E0B',
      advanced: '#10B981',
    };

    const barH = 28;
    const gap = 12;
    const labelW = 60;
    const barW = W - labelW - 16;

    const drawBar = (y: number, label: string, dist: DistribucionNivelesResponse | null) => {
      if (!dist) return;

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary') ||
        '#6B7280';
      ctx.textAlign = 'left';
      ctx.fillText(label, 0, y + barH / 2 + 4);

      const segments = [
        { pct: dist.porcentajeBasico, color: colors['basic'] },
        { pct: dist.porcentajeIntermedio, color: colors['intermediate'] },
        { pct: dist.porcentajeAvanzado, color: colors['advanced'] },
      ];

      let x = labelW;
      segments.forEach((seg) => {
        const w = (seg.pct / 100) * barW;
        if (w < 1) return;
        ctx.fillStyle = seg.color;
        ctx.beginPath();
        ctx.roundRect?.(x, y, w, barH, 3);
        ctx.fill();

        if (w > 28) {
          ctx.fillStyle = 'white';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${seg.pct.toFixed(0)}%`, x + w / 2, y + barH / 2 + 4);
        }
        x += w;
      });

      // Borde del track vacío
      ctx.strokeStyle = 'rgba(128,128,128,.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect?.(labelW, y, barW, barH, 3);
      ctx.stroke();
    };

    drawBar(10, 'PRE', preD);
    drawBar(10 + barH + gap, 'POST', postD);

    // Leyenda
    const legendY = 10 + (barH + gap) * 2 + 10;
    const legends = [
      { label: 'Básico', color: colors['basic'] },
      { label: 'Intermedio', color: colors['intermediate'] },
      { label: 'Avanzado', color: colors['advanced'] },
    ];

    let lx = labelW;
    legends.forEach((l) => {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(lx + 5, legendY + 5, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary') ||
        '#6B7280';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(l.label, lx + 14, legendY + 9);
      lx += 80;
    });
  }
}
