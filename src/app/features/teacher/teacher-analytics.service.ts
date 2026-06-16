import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  CompletionStats,
  ReporteGrupoResponse,
  QuestionnaireSummary,
  EstudianteQueNecesitaApoyoResponse,
} from '../../core/models/teacher-analytics.model';
import { InformeProgresoEstudianteResponse } from '../../core/models/analytics.model';
import { EvaluacionEstudianteResponse } from '../../core/models/assessment.model';

@Injectable({ providedIn: 'root' })
export class TeacherAnalyticsService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  getGroupReport(idCuestionario: number): Observable<ApiResponse<ReporteGrupoResponse>> {
    return this.http.get<ApiResponse<ReporteGrupoResponse>>(
      `${this.API}/analitica/cuestionario/${idCuestionario}/reporte-grupo`,
    );
  }

  getSummary(idCuestionario: number): Observable<ApiResponse<QuestionnaireSummary>> {
    return this.http.get<ApiResponse<QuestionnaireSummary>>(
      `${this.API}/analitica/cuestionario/${idCuestionario}/resumen`,
    );
  }

  getCompletionStats(idCuestionario: number): Observable<ApiResponse<CompletionStats>> {
    return this.http.get<ApiResponse<CompletionStats>>(
      `${this.API}/analitica/cuestionario/${idCuestionario}/estadistica-finalizacion`,
    );
  }

  getStudentsNeedingSupport(idCuestionario: number): Observable<ApiResponse<EstudianteQueNecesitaApoyoResponse[]>> {
    return this.http.get<ApiResponse<EstudianteQueNecesitaApoyoResponse[]>>(
      `${this.API}/analitica/cuestionario/${idCuestionario}/estudiantes-necesitan-apoyo`,
    );
  }

  getPublishedQuestionnaires(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}/cuestionario/listar_cuestionarios_activos`);
  }

  /** Progreso de un estudiante (incluye su plan de mejoramiento actual). */
  getStudentProgress(
    idEstudiante: number,
    idCuestionario: number,
  ): Observable<ApiResponse<InformeProgresoEstudianteResponse>> {
    return this.http.get<ApiResponse<InformeProgresoEstudianteResponse>>(
      `${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${idCuestionario}/progreso`,
    );
  }

  /** Detalle de una evaluación (sesión) con las respuestas del estudiante. */
  getEvaluationDetail(
    idEvaluacion: number,
  ): Observable<ApiResponse<EvaluacionEstudianteResponse>> {
    return this.http.get<ApiResponse<EvaluacionEstudianteResponse>>(
      `${this.API}/evaluacion/consultar-id/${idEvaluacion}`,
    );
  }
}
