// questionnaire-list/questionnaire-list.component.ts

import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { Router, RouterLink } from "@angular/router";
import { QuestionnairesService } from "../questionnaires.service";
import { CuestionarioResponse, EstadoCuestionario } from "../../../core/models/questionnaire-admin.model";
import { catchError, forkJoin, Observable, of, switchMap, tap } from "rxjs";
import { ScoreMatrixService } from "../../score-matrix/score-matrix.service";
import { PlanFortalecimientoResponse } from "../../../core/models/plan-fortalecimiento.model";
import { PuntuacionMatrixResponse } from "../../../core/models/score-matrix.model";
import { PreguntaDeCuestionarioResponse } from "../../../core/models/questionnaire-admin.model";

export interface ChecklistItem {
  label: string;
  detail: string;
  ok: boolean;
}

export interface ChecklistResult {
  loading: boolean;
  items: ChecklistItem[];
  readyToPublish: boolean;
}


@Component({
  selector: 'app-questionnaire-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatMenuModule, MatTooltipModule,
    MatDividerModule, MatPaginatorModule,
  ],
  templateUrl: './questionnaire-list.html',
  styleUrl:    './questionnaire-list.scss'
})
export class QuestionnaireList implements OnInit {

  private svc       = inject(QuestionnairesService);
  private matrixSvc = inject(ScoreMatrixService);
  private router    = inject(Router);

  loading        = signal(true);
  questionnaires = signal<CuestionarioResponse[]>([]);
  actionLoading  = signal<number | null>(null);
  errorMsg       = signal<string | null>(null);
  searchText     = signal('');
  filterStatus   = signal<EstadoCuestionario | 'ALL'>('ALL');

  // Paginación (cliente)
  pageIndex = signal(0);
  pageSize  = signal(5);

  // Checklist de pre-publicación: mapa idCuestionario → resultado
  checklists = signal<Map<number, ChecklistResult>>(new Map());

  checklist(id: number): ChecklistResult | null {
    return this.checklists().get(id) ?? null;
  }

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

  // Página actual de la lista filtrada.
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  /** Cambia el texto de búsqueda y vuelve a la primera página. */
  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.pageIndex.set(0);
  }

  /** Cambia el filtro de estado y vuelve a la primera página. */
  onStatusChange(value: EstadoCuestionario | 'ALL'): void {
    this.filterStatus.set(value);
    this.pageIndex.set(0);
  }

  /** Maneja el cambio de página/tamaño del paginador. */
  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

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
        // Excluir los eliminados lógicamente y ordenar por fecha de creación
        // descendente (el último creado aparece primero).
        const lista = (res.data ?? [])
          .filter(q => q.estadoCuestionario !== 'ELIMINADO')
          .sort((a, b) => this.creationTime(b) - this.creationTime(a));
        this.questionnaires.set(lista);
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /**
   * Marca de tiempo de creación para ordenar. Usa createdAt (o fechaCreacion);
   * si no hay fecha, cae al id del cuestionario (los ids mayores son más nuevos).
   */
  private creationTime(q: CuestionarioResponse): number {
    const fecha = q.createdAt ?? q.fechaCreacion;
    const t = fecha ? new Date(fecha).getTime() : NaN;
    return Number.isNaN(t) ? (q.idCuestionario ?? 0) : t;
  }

  openBuilder(id: number): void {
    this.router.navigate(['/app/questionnaires', id, 'builder']);
  }

  toggleChecklist(q: CuestionarioResponse): void {
    const id = q.idCuestionario;
    const current = new Map(this.checklists());

    // Si ya está abierto → cerrar
    if (current.has(id)) {
      current.delete(id);
      this.checklists.set(current);
      return;
    }

    // Abrir con estado de carga
    current.set(id, { loading: true, items: [], readyToPublish: false });
    this.checklists.set(current);

    // 1) Cargar preguntas y entradas de matriz en paralelo
    forkJoin({
      preguntas: this.svc.getQuestionnaireQuestions(id)
        .pipe(catchError(() => of({ data: [] as PreguntaDeCuestionarioResponse[] }))),
      matriz: this.matrixSvc.list(id)
        .pipe(catchError(() => of([] as PuntuacionMatrixResponse[]))),
    }).pipe(
      switchMap(({ preguntas, matriz }) => {
        const entries: PuntuacionMatrixResponse[] = matriz;

        const globalBajo       = entries.find(e => !e.idDimension && e.nivel === 'BAJO') ?? null;
        const globalIntermedio = entries.find(e => !e.idDimension && e.nivel === 'INTERMEDIO') ?? null;

        // 2) Cargar planes de entradas globales BAJO e INTERMEDIO
        const planBajo$ = globalBajo
          ? this.matrixSvc.listPlans(globalBajo.id).pipe(catchError(() => of([] as PlanFortalecimientoResponse[])))
          : of([] as PlanFortalecimientoResponse[]);
        const planIntermedio$ = globalIntermedio
          ? this.matrixSvc.listPlans(globalIntermedio.id).pipe(catchError(() => of([] as PlanFortalecimientoResponse[])))
          : of([] as PlanFortalecimientoResponse[]);

        return forkJoin({
          preguntas:     of(preguntas.data ?? [] as PreguntaDeCuestionarioResponse[]),
          entries:       of(entries),
          planBajo:      planBajo$,
          planIntermedio: planIntermedio$,
        });
      }),
    ).subscribe(({ preguntas, entries, planBajo, planIntermedio }) => {
      const totalPreguntas = preguntas.length;

      // Entradas con dimensión
      const dimEntries    = entries.filter(e => !!e.idDimension);
      const dimNiveles    = new Set(dimEntries.map(e => e.nivel));
      const tieneMatrizDim = dimEntries.length > 0 &&
        dimNiveles.has('BAJO') && dimNiveles.has('INTERMEDIO');

      // Entradas globales
      const globalEntries     = entries.filter(e => !e.idDimension);
      const globalNiveles     = new Set(globalEntries.map(e => e.nivel));
      const tieneMatrizGlobal = globalNiveles.has('BAJO') && globalNiveles.has('INTERMEDIO');

      const tienePlanBajo       = planBajo.length > 0;
      const tienePlanIntermedio = planIntermedio.length > 0;

      const nivelesAusentesDim    = (['BAJO','INTERMEDIO'] as const).filter(n => !dimNiveles.has(n));
      const nivelesAusentesGlobal = (['BAJO','INTERMEDIO'] as const).filter(n => !globalNiveles.has(n));

      const items: ChecklistItem[] = [
        {
          label:  'Preguntas asociadas',
          detail: totalPreguntas > 0
            ? `${totalPreguntas} pregunta${totalPreguntas !== 1 ? 's' : ''} configurada${totalPreguntas !== 1 ? 's' : ''}`
            : 'Ninguna pregunta asociada al cuestionario',
          ok: totalPreguntas >= 2,
        },
        {
          label:  'Matriz por dimensión',
          detail: tieneMatrizDim
            ? `${dimEntries.length} entradas (BAJO, INTERMEDIO)`
            : dimEntries.length > 0
              ? `Faltan niveles: ${nivelesAusentesDim.join(', ')}`
              : 'Sin entradas de matriz por dimensión',
          ok: tieneMatrizDim,
        },
        {
          label:  'Matriz global',
          detail: tieneMatrizGlobal
            ? `${globalEntries.length} entradas globales (BAJO, INTERMEDIO)`
            : globalEntries.length > 0
              ? `Faltan niveles: ${nivelesAusentesGlobal.join(', ')}`
              : 'Sin entradas de matriz global',
          ok: tieneMatrizGlobal,
        },
        {
          label:  'Plan de mejoramiento — Básico (BAJO)',
          detail: tienePlanBajo
            ? `${planBajo.length} plan${planBajo.length !== 1 ? 'es' : ''} configurado${planBajo.length !== 1 ? 's' : ''}`
            : 'Sin plan de mejoramiento para nivel BAJO',
          ok: tienePlanBajo,
        },
        {
          label:  'Plan de mejoramiento — Intermedio',
          detail: tienePlanIntermedio
            ? `${planIntermedio.length} plan${planIntermedio.length !== 1 ? 'es' : ''} configurado${planIntermedio.length !== 1 ? 's' : ''}`
            : 'Sin plan de mejoramiento para nivel INTERMEDIO',
          ok: tienePlanIntermedio,
        },
      ];

      const updated = new Map(this.checklists());
      updated.set(id, { loading: false, items, readyToPublish: items.every(i => i.ok) });
      this.checklists.set(updated);
    });
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

  /** Duplica el cuestionario completo (preguntas + ramificaciones). La copia queda en BORRADOR. */
  duplicate(q: CuestionarioResponse): void {
    this.actionLoading.set(q.idCuestionario);
    this.errorMsg.set(null);

    this.svc.duplicate(q.idCuestionario).pipe(
      tap(() => {
        this.actionLoading.set(null);
        this.load();
      }),
      catchError((err) => {
        this.actionLoading.set(null);
        this.errorMsg.set(err?.error?.message ?? 'Error al duplicar el cuestionario.');
        return [];
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