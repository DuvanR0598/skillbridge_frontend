import { SkillTipo } from './dimension.model';

export type SkillNivel = 'BAJO' | 'INTERMEDIO' | 'AVANZADO';

export type NivelBloom =
  | 'RECORDAR' | 'COMPRENDER' | 'APLICAR' | 'ANALIZAR' | 'EVALUAR' | 'CREAR';

export const NIVEL_OPTIONS: { value: SkillNivel; label: string }[] = [
  { value: 'BAJO', label: 'Bajo' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
];

export const BLOOM_OPTIONS: NivelBloom[] = [
  'RECORDAR', 'COMPRENDER', 'APLICAR', 'ANALIZAR', 'EVALUAR', 'CREAR',
];

export interface PuntuacionMatrixRequest {
  idPregunta?:                number;   // null = evaluación global del skill
  skill:                      SkillTipo;
  idDimension?:               number;   // dimensión gestionada (tabla)
  nivel:                      SkillNivel;
  minPuntaje:                 number;
  maxPuntaje:                 number;
  descripcion?:               string;
  caracteristicasObservables?: string;
  nivelBloom?:                NivelBloom[];
}

export interface ActualizarPuntuacionMatrixRequest {
  minPuntaje?:                number;
  maxPuntaje?:                number;
  descripcion?:               string;
  caracteristicasObservables?: string;
  nivelesBloom?:              NivelBloom[];
}

export interface PuntuacionMatrixResponse {
  id:                         number;
  idCuestionario:             number;
  idPregunta?:                number | null;
  textoPregunta?:             string | null;
  skill:                      SkillTipo;
  dimension?:                 string | null;   // enum legado
  idDimension?:               number | null;
  dimensionNombre?:           string | null;
  nivel:                      SkillNivel;
  minPuntaje:                 number;
  maxPuntaje:                 number;
  descripcion?:               string | null;
  caracteristicasObservables?: string | null;
  nivelesBloom:               NivelBloom[];
  fullConfigurado:            boolean;
  createdAt?:                 string;
  updatedAt?:                 string;
}
