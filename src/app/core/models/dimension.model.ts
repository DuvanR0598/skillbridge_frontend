export type SkillTipo = 'PENSAMIENTO_CRITICO' | 'ADAPTABILIDAD';

export const SKILL_OPTIONS: { value: SkillTipo; label: string }[] = [
  { value: 'PENSAMIENTO_CRITICO', label: 'Pensamiento Crítico' },
  { value: 'ADAPTABILIDAD', label: 'Adaptabilidad' },
];

export interface DimensionResponse {
  id:          number;
  nombre:      string;
  descripcion?: string;
  skill:       SkillTipo;
  createdAt?:  string;
}

export interface DimensionRequest {
  nombre:      string;
  descripcion?: string;
  skill:       SkillTipo;
}
