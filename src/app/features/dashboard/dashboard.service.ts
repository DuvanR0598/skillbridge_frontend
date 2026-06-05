import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { DashboardStats, RecentActivity, SkillSummary } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private http = inject(HttpClient);
  private authSvc = inject(AuthService);
  private API = environment.apiUrl;

  /**
   * Carga las estadísticas del dashboard según el rol.
   * Estudiante → su propio progreso.
   * Docente/Admin → resumen del cuestionario más reciente.
   */
  loadDashboardData(idCuestionario?: number): Observable<{
    stats: DashboardStats;
    skills: SkillSummary[];
  }> {
    const idEstudiante = this.authSvc.currentUser()?.id;
    const isStudent = this.authSvc.isStudent();

    if (isStudent && idEstudiante && idCuestionario) {
      return forkJoin({
        progress: this.http
          .get<
            ApiResponse<any>
          >(`${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${idCuestionario}/progreso`)
          .pipe(catchError(() => of({ data: null }))),
        status: this.http
          .get<ApiResponse<any>>(`${this.API}/usuarios/me/perfil/estado`)
          .pipe(catchError(() => of({ data: { completionPercentage: 0 } }))),
      }).pipe(
        map(({ progress, status }) => {
          const p = progress?.data;
          return {
            stats: { 
              activeQuestionnaires: 1,
              completedAssessments: p ? (p.postTestAssessmentId ? 2 : 1) : 0,
              currentLevel:
                p?.skillProgress?.[0]?.postLevel ?? p?.skillProgress?.[0]?.preLevel ?? null,
              profileCompletion: status?.data?.completionPercentage ?? 0,
            } as DashboardStats,
            skills: this.mapSkillProgress(p?.skillProgress ?? []),
          };
        }),
      );
    }

    // Default para coordinador/admin o sin cuestionario
    return of({
      stats: {
        activeQuestionnaires: 0,
        completedAssessments: 0,
        currentLevel: null,
        profileCompletion: 100,
      },
      skills: [],
    });
  }

  getActiveQuestionnaires(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}/cuestionario?status=PUBLICADO`);
  }

  /**
   * Actividad reciente del usuario autenticado. El backend la deriva según
   * el rol (estudiante → evaluaciones; coordinador/admin → cuestionarios).
   */
  getActividadReciente(): Observable<RecentActivity[]> {
    return this.http
      .get<ApiResponse<RecentActivity[]>>(`${this.API}/dashboard/actividad-reciente`)
      .pipe(
        map((res) => res.data ?? []),
        catchError(() => of([])),
      );
  }

  private mapSkillProgress(progress: any[]): SkillSummary[] {
    return progress.map((p) => ({
      skill: p.skill,
      dimension: p.dimension ?? 'GLOBAL',
      prePercentage: p.prePercentage ?? null,
      postPercentage: p.postPercentage ?? null,
      level: p.postLevel ?? p.preLevel ?? null,
      delta: p.percentageDelta ?? null,
    }));
  }
}
