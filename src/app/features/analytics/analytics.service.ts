import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  HistorialIntentosResponse,
  EscalamientoResponse,
  InformeProgresoEstudianteResponse,
} from '../../core/models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

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
