export type PlanAxis = 'ACADEMICO' | 'EXPERIMENTAL' | 'PERSONAL';
export type TipoAccion = 'LEER' | 'VER' | 'PRACTICAR';

export const PLAN_AXIS_OPTIONS: { value: PlanAxis; label: string }[] = [
  { value: 'ACADEMICO', label: 'Académico' },
  { value: 'EXPERIMENTAL', label: 'Experimental' },
  { value: 'PERSONAL', label: 'Personal' },
];

export const TIPO_ACCION_OPTIONS: { value: TipoAccion; label: string }[] = [
  { value: 'LEER', label: 'Leer' },
  { value: 'VER', label: 'Ver' },
  { value: 'PRACTICAR', label: 'Practicar' },
];

export interface PlanFortalecimientoRequest {
  planAxis:    PlanAxis;
  titulo:      string;
  descripcion: string;
  tipoAccion:  TipoAccion;
  recursos?:   string[];
}

export interface ActualizarPlanFortalecimientoRequest {
  titulo?:      string;
  descripcion?: string;
  tipoAccion?:  TipoAccion;
  recursos?:    string[];
}

export interface PlanFortalecimientoResponse {
  id:                 number;
  idPuntuacionMatrix: number;
  planAxis:           PlanAxis;
  titulo:             string;
  descripcion:        string;
  tipoAccion:         TipoAccion;
  recursos:           string[];
  createdAt?:         string;
  updatedAt?:         string;
}
