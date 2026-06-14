// src/app/features/assessment/assessment.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  InformeEvaluacionResponse,
  EvaluacionFase,
  CuestionarioEntregaResponse,
  EvaluacionEstudianteResponse,
  EnviarRespuestaRequest,
  TiempoConteoResponse
} from '../../core/models/assessment.model';

@Injectable({ providedIn: 'root' })
export class AssessmentService {

  private http = inject(HttpClient);
  private API  = environment.apiUrl;

  // Listar cuestionarios publicados disponibles para el estudiante.
  // El backend devuelve los "activos" (no eliminados); aquí filtramos
  // solo los PUBLICADO y normalizamos los campos a inglés para la UI.
  getPublishedQuestionnaires(): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.API}/cuestionario/listar_cuestionarios_activos`)
      .pipe(
        map((res) =>
          (res.data ?? [])
            .filter((q) => q.estadoCuestionario === 'PUBLICADO')
            .map((q) => ({
              id:             q.idCuestionario,
              name:           q.nombre,
              purpose:        q.objetivo,
              totalQuestions: q.totalPreguntas,
              randomOrder:    q.ordenAleatorio,
              createdAt:      q.createdAt ?? q.fechaCreacion,
              status:         q.estadoCuestionario,
              fechaInicio:    q.fechaInicio ?? null,
              fechaFin:       q.fechaFin ?? null,
              disponible:     q.disponible ?? true,
            })),
        ),
      );
  }

  // Obtener el cuestionario con preguntas en orden aleatorio
  deliverQuestionnaire(id: number): Observable<ApiResponse<CuestionarioEntregaResponse>> {
    return this.http.get<ApiResponse<CuestionarioEntregaResponse>>(
      `${this.API}/cuestionario/${id}/entregar_cuestionario`
    );
  }

  // Iniciar sesión de evaluación
  startAssessment(
    idCuestionario: number,
    phase: EvaluacionFase
  ): Observable<ApiResponse<EvaluacionEstudianteResponse>> {
    const params = new HttpParams().set('phase', phase);
    return this.http.post<ApiResponse<EvaluacionEstudianteResponse>>(
      `${this.API}/evaluacion/cuestionario/${idCuestionario}/iniciar`,
      {},
      { params }
    );
  }

  // Inicia (o consulta) el conteo del tiempo límite. Idempotente: fija el ancla
  // la primera vez y devuelve los segundos restantes calculados en el servidor.
  iniciarConteo(
    idEvaluacion: number
  ): Observable<ApiResponse<TiempoConteoResponse>> {
    return this.http.post<ApiResponse<TiempoConteoResponse>>(
      `${this.API}/evaluacion/${idEvaluacion}/iniciar-conteo`,
      {}
    );
  }

  // Enviar respuesta a una pregunta
  submitAnswer(
    idEvaluacion: number,
    request: EnviarRespuestaRequest
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API}/evaluacion/${idEvaluacion}/respuestas`,
      request
    );
  }

  // Actualizar respuesta ya enviada (solo si la sesión está EN_PROGRESO).
  updateAnswer(
    idEvaluacion: number,
    idPregunta:   number,
    request:      EnviarRespuestaRequest
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API}/evaluacion/${idEvaluacion}/respuesta/${idPregunta}`,
      request
    );
  }

  // Completar la sesión y obtener el reporte
  completeAssessment(
    idEvaluacion: number
  ): Observable<ApiResponse<InformeEvaluacionResponse>> {
    return this.http.patch<ApiResponse<InformeEvaluacionResponse>>(
      `${this.API}/evaluacion/${idEvaluacion}/completo`,
      {}
    );
  }

  // Obtener reporte de sesión ya completada
  getReport(
    idEvaluacion: number
  ): Observable<ApiResponse<InformeEvaluacionResponse>> {
    return this.http.get<ApiResponse<InformeEvaluacionResponse>>(
      `${this.API}/evaluacion/${idEvaluacion}/reporte`
    );
  }

  // Consultar una sesión por id (incluye sus respuestas ya guardadas)
  getAssessment(
    idEvaluacion: number
  ): Observable<ApiResponse<EvaluacionEstudianteResponse>> {
    return this.http.get<ApiResponse<EvaluacionEstudianteResponse>>(
      `${this.API}/evaluacion/consultar-id/${idEvaluacion}`
    );
  }

  // Historial de sesiones del estudiante
  getHistory(
    idEstudiante:       number,
    idCuestionario: number
  ): Observable<ApiResponse<EvaluacionEstudianteResponse[]>> {
    return this.http.get<ApiResponse<EvaluacionEstudianteResponse[]>>(
      `${this.API}/evaluacion/estudiante/${idEstudiante}/cuestionario/${idCuestionario}`
    );
  }
}