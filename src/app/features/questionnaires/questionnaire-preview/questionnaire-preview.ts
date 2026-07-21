import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QuestionnairesService } from '../questionnaires.service';
import { CuestionarioResponse, PreguntaDeCuestionarioResponse } from '../../../core/models/questionnaire-admin.model';
import { skillMeta } from '../../../core/models/dimension.model';

@Component({
  selector: 'app-questionnaire-preview',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questionnaire-preview.html',
  styleUrl: './questionnaire-preview.scss',
})
export class QuestionnairePreview implements OnInit, OnDestroy {
  protected readonly skillMeta = skillMeta;
  private route = inject(ActivatedRoute);
  private svc   = inject(QuestionnairesService);

  loading       = signal(true);
  errorMsg      = signal<string | null>(null);
  questionnaire = signal<CuestionarioResponse | null>(null);
  questions     = signal<PreguntaDeCuestionarioResponse[]>([]);
  today         = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  ngOnInit(): void {
    document.body.classList.add('print-preview');
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      q:   this.svc.getById(id).pipe(catchError(() => of({ data: null }))),
      qs:  this.svc.getQuestionnaireQuestions(id).pipe(catchError(() => of({ data: [] }))),
    }).subscribe(({ q, qs }) => {
      this.questionnaire.set(q.data);
      this.questions.set(qs.data ?? []);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('print-preview');
  }

  print(): void {
    window.print();
  }

  typeLabel(t: string): string {
    const m: Record<string, string> = {
      VERDADERO_FALSO: 'Verdadero / Falso',
      LIKERT:          'Escala Likert',
      OPCION_UNICA:    'Opción única',
      OPCION_MULTIPLE: 'Opción múltiple',
      DESCRIPCION:     'Respuesta abierta',
    };
    return m[t] ?? t;
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }
}
