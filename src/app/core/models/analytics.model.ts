// SkillTipo se centraliza en dimension.model.ts (fuente única). Se importa para
// uso local y se reexporta para no romper los imports existentes desde este módulo.
import type { SkillTipo } from './dimension.model';
export type { SkillTipo };
export type SkillNivel = 'BAJO' | 'INTERMEDIO' | 'AVANZADO';
export type DecisionEscala = 'CERTIFICAR' | 'REINICIAR' | 'PENDIENTE';

export interface SkillProgresoResponse {
  skill: SkillTipo;
  idDimension?: number | null;
  dimensionNombre?: string | null;
  prePuntaje: number | null;
  preMaxPuntaje: number | null;
  prePorcentaje: number | null;
  preNivel: SkillNivel | null;
  postPuntaje: number | null;
  postMaxPuntaje: number | null;
  postPorcentaje: number | null;
  postNivel: SkillNivel | null;
  puntajeDelta: number | null;
  porcentajeDelta: number | null;
  nivelMejorado: boolean;
  alcanzoNivelAva: boolean;
}

export interface InformeProgresoEstudianteResponse {
  idEstudiante: number;
  idCuestionario: number;
  nombreCuestionario: string;
  idPreTestEvaluacion: number | null;
  idPostTestEvaluacion: number | null;
  preTestDate: string | null;
  postTestDate: string | null;
  skillProgreso: SkillProgresoResponse[];
  decisionEscala: DecisionEscala;
  razonEscala: string;
  planActual: PlanActual[];
  resumen: string;
}

export interface PlanActual {
  id: number;
  planAxis: 'ACADEMICO' | 'EXPERIMENTAL' | 'PERSONAL';
  titulo: string;
  descripcion: string;
  tipoAccion: '	LEER' | 'VER' | 'PRACTICAR';
  recursos: string[];
}

export interface EscalamientoResponse {
  idEstudiante: number;
  idCuestionario: number;
  decision: DecisionEscala;
  razon: string;
  dimensionesAlcanzadas: SkillProgresoResponse[];
  dimensionesPendientes: SkillProgresoResponse[];
}

export interface HistorialIntentosResponse {
  idEvaluacion: number;
  numeroIntentos: number;
  fase: 'PRE_TEST' | 'POST_TEST';
  estado: string;
  startedAt: string;
  finishedAt: string | null;
  puntaje: PuntuacionIntentosResponse[];
}

export interface PuntuacionIntentosResponse {
  skill: SkillTipo;
  idDimension?: number | null;
  dimensionNombre?: string | null;
  totalPuntuacion: number;
  porcentajePuntuacion: number;
  nivel: string;
}
