import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { SkillTipo } from '../../core/models/dimension.model';
import {
  ActualizarPuntuacionMatrixRequest,
  PuntuacionMatrixRequest,
  PuntuacionMatrixResponse,
} from '../../core/models/score-matrix.model';
import {
  ActualizarPlanFortalecimientoRequest,
  PlanFortalecimientoRequest,
  PlanFortalecimientoResponse,
} from '../../core/models/plan-fortalecimiento.model';

@Injectable({ providedIn: 'root' })
export class ScoreMatrixService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  private base(idCuestionario: number): string {
    return `${this.API}/cuestionarios/${idCuestionario}/puntuacion_matrix`;
  }

  list(idCuestionario: number, skill?: SkillTipo): Observable<PuntuacionMatrixResponse[]> {
    let params = new HttpParams();
    if (skill) params = params.set('skill', skill);
    return this.http
      .get<ApiResponse<PuntuacionMatrixResponse[]>>(`${this.base(idCuestionario)}/listar`, { params })
      .pipe(map((res) => res.data ?? []));
  }

  create(
    idCuestionario: number,
    req: PuntuacionMatrixRequest,
  ): Observable<PuntuacionMatrixResponse> {
    return this.http
      .post<ApiResponse<PuntuacionMatrixResponse>>(`${this.base(idCuestionario)}/crear`, req)
      .pipe(map((res) => res.data));
  }

  update(
    idCuestionario: number,
    matrixId: number,
    req: ActualizarPuntuacionMatrixRequest,
  ): Observable<PuntuacionMatrixResponse> {
    return this.http
      .put<ApiResponse<PuntuacionMatrixResponse>>(
        `${this.base(idCuestionario)}/${matrixId}/actualizar`,
        req,
      )
      .pipe(map((res) => res.data));
  }

  remove(idCuestionario: number, matrixId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base(idCuestionario)}/${matrixId}/eliminar`)
      .pipe(map(() => undefined));
  }

  // ── Planes de fortalecimiento (anidados a una entrada de matriz) ──
  private planBase(matrixId: number): string {
    return `${this.API}/puntuacion-matrix/${matrixId}/plan-fortalecimiento`;
  }

  listPlans(matrixId: number): Observable<PlanFortalecimientoResponse[]> {
    return this.http
      .get<ApiResponse<PlanFortalecimientoResponse[]>>(`${this.planBase(matrixId)}/listar`)
      .pipe(map((res) => res.data ?? []));
  }

  createPlan(
    matrixId: number,
    req: PlanFortalecimientoRequest,
  ): Observable<PlanFortalecimientoResponse> {
    return this.http
      .post<ApiResponse<PlanFortalecimientoResponse>>(`${this.planBase(matrixId)}/crear`, req)
      .pipe(map((res) => res.data));
  }

  updatePlan(
    matrixId: number,
    idPlan: number,
    req: ActualizarPlanFortalecimientoRequest,
  ): Observable<PlanFortalecimientoResponse> {
    return this.http
      .put<ApiResponse<PlanFortalecimientoResponse>>(
        `${this.planBase(matrixId)}/actualizar/${idPlan}`,
        req,
      )
      .pipe(map((res) => res.data));
  }

  removePlan(matrixId: number, idPlan: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.planBase(matrixId)}/eliminar/${idPlan}`)
      .pipe(map(() => undefined));
  }
}
