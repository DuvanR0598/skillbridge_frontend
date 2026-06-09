import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  AddQuestionToQuestionnaireRequest,
  CuestionarioRequest,
  PreguntaRequest,
  CuestionarioResponse,
  PreguntaResponse,
  PreguntaDeCuestionarioResponse,
  ActualizarCuestionarioRequest,
} from '../../core/models/questionnaire-admin.model';

@Injectable({ providedIn: 'root' })
export class QuestionnairesService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  // ── Cuestionarios ──────────────────────────────────────────

  getAll(): Observable<ApiResponse<CuestionarioResponse[]>> {
    return this.http.get<ApiResponse<CuestionarioResponse[]>>(`${this.API}/cuestionario/listar_cuestionarios`);
  }

  getById(idCuestionario: number): Observable<ApiResponse<CuestionarioResponse>> {
    return this.http.get<ApiResponse<CuestionarioResponse>>(
      `${this.API}/cuestionario/buscar_cuestionario_id/${idCuestionario}`,
    );
  }

  // Preguntas que ya tiene el cuestionario (vista coordinador, con opciones)
  getQuestionnaireQuestions(
    idCuestionario: number,
  ): Observable<ApiResponse<PreguntaDeCuestionarioResponse[]>> {
    return this.http.get<ApiResponse<PreguntaDeCuestionarioResponse[]>>(
      `${this.API}/cuestionario/${idCuestionario}/preguntas`,
    );
  }

  create(req: CuestionarioRequest): Observable<ApiResponse<CuestionarioResponse>> {
    return this.http.post<ApiResponse<CuestionarioResponse>>(`${this.API}/cuestionario/crear_cuestionario`, req);
  }

  updateSettings(
    id: number,
    req: ActualizarCuestionarioRequest,
  ): Observable<ApiResponse<CuestionarioResponse>> {
    return this.http.patch<ApiResponse<CuestionarioResponse>>(
      `${this.API}/cuestionario/${id}/actualizar`,
      req,
    );
  }

  complete(id: number): Observable<ApiResponse<CuestionarioResponse>> {
    return this.http.patch<ApiResponse<CuestionarioResponse>>(
      `${this.API}/cuestionario/${id}/completo`,
      {},
    );
  }

  publish(id: number): Observable<ApiResponse<CuestionarioResponse>> {
    return this.http.patch<ApiResponse<CuestionarioResponse>>(
      `${this.API}/cuestionario/${id}/publicar`,
      {},
    );
  }

  archive(id: number): Observable<ApiResponse<CuestionarioResponse>> {
    return this.http.patch<ApiResponse<CuestionarioResponse>>(
      `${this.API}/cuestionario/${id}/archivar`,
      {},
    );
  }

  softDelete(idCuestionario: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/cuestionario/borrado_logico/${idCuestionario}`);
  }

  // ── Preguntas del cuestionario ─────────────────────────────

  addQuestion(
    idCuestionario: number,
    req: AddQuestionToQuestionnaireRequest,
  ): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.API}/cuestionario/${idCuestionario}/pregunta`,
      req,
    );
  }

  removeQuestion(idCuestionario: number, idPregunta: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API}/cuestionario/${idCuestionario}/pregunta/${idPregunta}`,
    );
  }

  // ── Banco de preguntas ─────────────────────────────────────

  getAllQuestions(): Observable<ApiResponse<PreguntaResponse[]>> {
    return this.http.get<ApiResponse<PreguntaResponse[]>>(`${this.API}/preguntas/listar`);
  }

  createQuestion(req: PreguntaRequest): Observable<ApiResponse<PreguntaResponse>> {
    return this.http.post<ApiResponse<PreguntaResponse>>(`${this.API}/preguntas/crear_pregunta`, req);
  }

  deleteQuestion(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API}/preguntas/eliminar_pregunta/${id}`);
  }
}
