// questionnaire-list/questionnaire-list.component.ts

import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Router, RouterLink } from "@angular/router";
import { QuestionnairesService } from "../questionnaires.service";
import { CuestionarioResponse, EstadoCuestionario } from "../../../core/models/questionnaire-admin.model";
import { catchError, Observable, tap } from "rxjs";


@Component({
  selector: 'app-questionnaire-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatMenuModule, MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './questionnaire-list.html',
  styleUrl:    './questionnaire-list.scss'
})
export class QuestionnaireList implements OnInit {

  private svc    = inject(QuestionnairesService);
  private router = inject(Router);

  loading        = signal(true);
  questionnaires = signal<CuestionarioResponse[]>([]);
  actionLoading  = signal<number | null>(null);
  errorMsg       = signal<string | null>(null);
  searchText     = signal('');
  filterStatus   = signal<EstadoCuestionario | 'ALL'>('ALL');

  filtered = computed(() => {
    const q    = this.questionnaires();
    const text = this.searchText().toLowerCase();
    const st   = this.filterStatus();
    return q.filter(item =>
      (st === 'ALL' || item.estadoCuestionario === st) &&
      (item.nombre.toLowerCase().includes(text) ||
       (item.objetivo ?? '').toLowerCase().includes(text))
    );
  });

  statusOptions: { value: EstadoCuestionario | 'ALL'; label: string }[] = [
    { value: 'ALL',       label: 'Todos' },
    { value: 'BORRADOR',  label: 'Borrador' },
    { value: 'COMPLETO',  label: 'Completo' },
    { value: 'PUBLICADO', label: 'Publicado' },
    { value: 'ARCHIVADO', label: 'Archivado' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: res => {
        // Excluir los eliminados lógicamente
        this.questionnaires.set(
          (res.data ?? []).filter(q => q.estadoCuestionario !== 'ELIMINADO')
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openBuilder(id: number): void {
    this.router.navigate(['/app/questionnaires', id, 'builder']);
  }

doAction(
  action: 'completo' | 'publicado' | 'archivado' | 'eliminado',
  q: CuestionarioResponse
): void {
  this.actionLoading.set(q.idCuestionario);
  this.errorMsg.set(null);

  let obs$: Observable<any>;  // ← Tipado explícito

  switch (action) {
    case 'completo':  obs$ = this.svc.complete(q.idCuestionario); break;
    case 'publicado': obs$ = this.svc.publish(q.idCuestionario);  break;
    case 'archivado': obs$ = this.svc.archive(q.idCuestionario);  break;
    case 'eliminado': obs$ = this.svc.softDelete(q.idCuestionario); break;
  }

  obs$.pipe(
    tap(() => {
      this.actionLoading.set(null);
      this.load();
    }),
    catchError((err) => {
      this.actionLoading.set(null);
      this.errorMsg.set(err?.error?.message ?? 'Error al ejecutar la acción.');
      return []; // Retorna observable vacío para completar la cadena
    })
  ).subscribe();
}

  getStatusLabel(s: EstadoCuestionario): string {
    const m: Record<EstadoCuestionario, string> = {
      BORRADOR:  'Borrador',
      COMPLETO:  'Completo',
      PUBLICADO: 'Publicado',
      ARCHIVADO: 'Archivado',
      ELIMINADO: 'Eliminado'
    };
    return m[s];
  }

  getStatusClass(s: EstadoCuestionario): string {
    const m: Record<EstadoCuestionario, string> = {
      BORRADOR:  'st-draft',
      COMPLETO:  'st-complete',
      PUBLICADO: 'st-published',
      ARCHIVADO: 'st-archived',
      ELIMINADO: 'st-deleted'
    };
    return m[s];
  }

  canComplete(q: CuestionarioResponse): boolean {
    return q.estadoCuestionario === 'BORRADOR' && q.totalPreguntas >= 2;
  }

  canPublish(q: CuestionarioResponse): boolean {
    return q.estadoCuestionario === 'COMPLETO';
  }

  canArchive(q: CuestionarioResponse): boolean {
    return q.estadoCuestionario === 'PUBLICADO';
  }

  canDelete(q: CuestionarioResponse): boolean {
    return q.estadoCuestionario === 'BORRADOR' || q.estadoCuestionario === 'COMPLETO';
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}