import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap } from 'rxjs';
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
   * Estudiante → datos reales derivados de sus cuestionarios publicados y
   * sus evaluaciones; el nivel y las barras vienen del progreso del último
   * cuestionario que el estudiante completó.
   */
  loadDashboardData(): Observable<{
    stats: DashboardStats;
    skills: SkillSummary[];
  }> {
    const idEstudiante = this.authSvc.currentUser()?.id;
    const isStudent = this.authSvc.isStudent();

    // Coordinador/Admin: el dashboard no muestra estadísticas de estudiante.
    if (!isStudent || !idEstudiante) {
      return of({
        stats: {
          activeQuestionnaires: 0,
          completedAssessments: 0,
          pendingAssessments: 0,
          currentLevel: null,
          profileCompletion: 100,
        },
        skills: [],
      });
    }

    return forkJoin({
      published: this.http
        .get<ApiResponse<any[]>>(`${this.API}/cuestionario/listar_cuestionarios_activos`)
        .pipe(
          map((r) => (r.data ?? []).filter((q) => q.estadoCuestionario === 'PUBLICADO')),
          catchError(() => of([] as any[])),
        ),
      status: this.http
        .get<ApiResponse<any>>(`${this.API}/usuarios/me/perfil/estado`)
        .pipe(catchError(() => of({ data: { porcentajeCompleto: 0 } }))),
    }).pipe(
      switchMap(({ published, status }) => {
        const profileCompletion = status?.data?.porcentajeCompleto ?? 0;

        if (published.length === 0) {
          return of({
            stats: {
              activeQuestionnaires: 0,
              completedAssessments: 0,
              pendingAssessments: 0,
              currentLevel: null,
              profileCompletion,
            } as DashboardStats,
            skills: [] as SkillSummary[],
          });
        }

        // Historial del estudiante por cada cuestionario publicado.
        const histories = published.map((q) =>
          this.http
            .get<ApiResponse<any[]>>(
              `${this.API}/evaluacion/estudiante/${idEstudiante}/cuestionario/${q.idCuestionario}`,
            )
            .pipe(
              map((r) => ({ idCuestionario: q.idCuestionario, sessions: r.data ?? [] })),
              catchError(() => of({ idCuestionario: q.idCuestionario, sessions: [] as any[] })),
            ),
        );

        return forkJoin(histories).pipe(
          switchMap((results) => {
            const completedAssessments = results.reduce(
              (acc, r) => acc + r.sessions.filter((s) => s.estado === 'COMPLETADO').length,
              0,
            );
            const pendingAssessments = results.filter(
              (r) => !r.sessions.some((s) => s.estado === 'COMPLETADO'),
            ).length;

            // Cuestionario con la evaluación COMPLETADA más reciente → fuente del nivel/barras.
            let targetId: number | null = null;
            let latest = -Infinity;
            for (const r of results) {
              for (const s of r.sessions) {
                if (s.estado !== 'COMPLETADO') continue;
                const t = s.finishedAt ? new Date(s.finishedAt).getTime() : 0;
                if (t >= latest) {
                  latest = t;
                  targetId = r.idCuestionario;
                }
              }
            }

            const baseStats: DashboardStats = {
              activeQuestionnaires: published.length,
              completedAssessments,
              pendingAssessments,
              currentLevel: null,
              profileCompletion,
            };

            if (targetId === null) {
              return of({ stats: baseStats, skills: [] as SkillSummary[] });
            }

            return this.http
              .get<ApiResponse<any>>(
                `${this.API}/analitica/estudiante/${idEstudiante}/cuestionario/${targetId}/progreso`,
              )
              .pipe(
                map((res) => {
                  const skillProgreso = res?.data?.skillProgreso ?? [];
                  const skills = this.mapSkillProgress(skillProgreso);
                  return {
                    stats: {
                      ...baseStats,
                      currentLevel:
                        skillProgreso[0]?.postNivel ?? skillProgreso[0]?.preNivel ?? null,
                    },
                    skills,
                  };
                }),
                catchError(() => of({ stats: baseStats, skills: [] as SkillSummary[] })),
              );
          }),
        );
      }),
    );
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
      dimension: p.dimensionNombre ?? 'Global',
      prePercentage: p.prePorcentaje ?? null,
      postPercentage: p.postPorcentaje ?? null,
      level: p.postNivel ?? p.preNivel ?? null,
      delta: p.porcentajeDelta ?? null,
    }));
  }
}
