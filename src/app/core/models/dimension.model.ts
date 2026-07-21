export type SkillTipo =
  | 'PENSAMIENTO_CRITICO'
  | 'ADAPTABILIDAD'
  | 'COMUNICACION'
  | 'RESOLUCION_DE_PROBLEMAS'
  | 'TRABAJO_EN_EQUIPO'
  | 'APRENDIZAJE_CONTINUO'
  | 'INQUIETUD_TECNICA_CIENTIFICA'
  | 'COOPERACION'
  | 'LIDERAZGO_ETICO'
  | 'PROACTIVIDAD'
  | 'CATEGORIA_UTILITARIA_1'
  | 'CATEGORIA_UTILITARIA_2'
  | 'CATEGORIA_UTILITARIA_3';

/** Metadatos de presentación de cada skill (fuente única de la verdad). */
export interface SkillMeta {
  value: SkillTipo;
  label: string;
  shortCode: string;
  color: string;
}

export const SKILL_OPTIONS: SkillMeta[] = [
  { value: 'PENSAMIENTO_CRITICO', label: 'Pensamiento Crítico', shortCode: 'PC', color: '#1A5C38' },
  { value: 'ADAPTABILIDAD', label: 'Adaptabilidad', shortCode: 'AD', color: '#2E7DA1' },
  { value: 'COMUNICACION', label: 'Comunicación', shortCode: 'CM', color: '#B0602D' },
  { value: 'RESOLUCION_DE_PROBLEMAS', label: 'Resolución de problemas', shortCode: 'RP', color: '#7A4EAB' },
  { value: 'TRABAJO_EN_EQUIPO', label: 'Trabajo en equipo', shortCode: 'TE', color: '#0F7A6B' },
  { value: 'APRENDIZAJE_CONTINUO', label: 'Aprendizaje continuo', shortCode: 'AC', color: '#3F7D20' },
  { value: 'INQUIETUD_TECNICA_CIENTIFICA', label: 'Inquietud técnica y científica', shortCode: 'IT', color: '#2E5E45' },
  { value: 'COOPERACION', label: 'Cooperación', shortCode: 'CP', color: '#C08A1E' },
  { value: 'LIDERAZGO_ETICO', label: 'Liderazgo ético', shortCode: 'LE', color: '#9A2B5C' },
  { value: 'PROACTIVIDAD', label: 'Proactividad', shortCode: 'PA', color: '#C0492E' },
  { value: 'CATEGORIA_UTILITARIA_1', label: 'Categoría utilitaria 1', shortCode: 'U1', color: '#607D8B' },
  { value: 'CATEGORIA_UTILITARIA_2', label: 'Categoría utilitaria 2', shortCode: 'U2', color: '#78909C' },
  { value: 'CATEGORIA_UTILITARIA_3', label: 'Categoría utilitaria 3', shortCode: 'U3', color: '#90A4AE' },
];

const SKILL_META_MAP: ReadonlyMap<string, SkillMeta> = new Map(
  SKILL_OPTIONS.map((o) => [o.value, o]),
);

/**
 * Devuelve los metadatos de presentación (etiqueta, código corto y color) de un
 * skill. Fuente única para toda la app; agregar un skill nuevo es una sola
 * entrada en SKILL_OPTIONS.
 */
export function skillMeta(skill: SkillTipo | string | null | undefined): SkillMeta {
  const found = skill ? SKILL_META_MAP.get(skill) : undefined;
  if (found) return found;
  const raw = skill ? String(skill) : '—';
  return {
    value: (skill as SkillTipo) ?? 'PENSAMIENTO_CRITICO',
    label: raw,
    shortCode: skill ? raw.slice(0, 2).toUpperCase() : '—',
    color: '#9AA8A0',
  };
}

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
