import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  HistorialIntentosResponse,
  EscalamientoResponse,
  InformeProgresoEstudianteResponse,
} from '../../core/models/analytics.model';

export interface EvaluatedQuestionnaire {
  idCuestionario: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  /**
   * Cuestionarios en los que el estudiante tiene al menos una evaluación
   * (de cualquier estado). Se derivan cruzando los cuestionarios publicados
   * con el historial del estudiante por cada uno.
   */
  getEvaluatedQuestionnaires(idEstudiante: number): Observable<EvaluatedQuestionnaire[]> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.API}/cuestionario/listar_cuestionarios_activos`)
      .pipe(
        map((r) => (r.data ?? []).filter((q) => q.estadoCuestionario === 'PUBLICADO')),
        catchError(() => of([] as any[])),
        switchMap((published) => {
          if (published.length === 0) return of([] as EvaluatedQuestionnaire[]);
          const calls = published.map((q) =>
            this.http
              .get<ApiResponse<any[]>>(
                `${this.API}/evaluacion/estudiante/${idEstudiante}/cuestionario/${q.idCuestionario}`,
              )
              .pipe(
                map((res) => ({ q, sessions: res.data ?? [] })),
                catchError(() => of({ q, sessions: [] as any[] })),
              ),
          );
          return forkJoin(calls).pipe(
            map((results) =>
              results
                .filter((r) => r.sessions.length > 0)
                .map((r) => ({ idCuestionario: r.q.idCuestionario, nombre: r.q.nombre })),
            ),
          );
        }),
      );
  }

  getStudentProgress(
    idEstudiante: number,
    idCuestionario: number,
  ): Observable<ApiResponse<InformeProgresoEstudianteResponse>> {
    return this.http.get<ApiResponse<InformeProgresoEstudianteResponse>>(
      `${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${idCuestionario}/progreso`,
    );
  }

  getEscalation(
    idEstudiante: number,
    idCuestionario: number,
  ): Observable<ApiResponse<EscalamientoResponse>> {
    return this.http.get<ApiResponse<EscalamientoResponse>>(
      `${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${idCuestionario}/escalar`,
    );
  }

  getAttemptHistory(
    idEstudiante: number,
    idCuestionario: number,
  ): Observable<ApiResponse<HistorialIntentosResponse[]>> {
    return this.http.get<ApiResponse<HistorialIntentosResponse[]>>(
      `${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${idCuestionario}/historial`,
    );
  }

  getProfileStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API}/usuarios/me/perfil/estado`);
  }
}
