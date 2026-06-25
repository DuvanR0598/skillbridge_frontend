import { DimensionResponse } from './dimension.model';

export type EstadoCuestionario =
  | 'BORRADOR' | 'COMPLETO' | 'PUBLICADO' | 'ARCHIVADO' | 'ELIMINADO';

export type QuestionType =
  | 'VERDADERO_FALSO' | 'LIKERT' | 'OPCION_UNICA'
  | 'OPCION_MULTIPLE' | 'DESCRIPCION';

// Envoltura genérica de respuestas paginadas (espejo de PaginaResponse del backend)
export interface PageResponse<T> {
  content:       T[];
  page:          number;  // 0-based
  size:          number;
  totalElements: number;
  totalPages:    number;
  first:         boolean;
  last:          boolean;
}

export interface CuestionarioResponse {
  idCuestionario:     number;
  nombre:             string;
  objetivo?:          string;
  instrucciones?:     string;
  fechaCreacion?:     string;
  ordenAleatorio:     boolean;
  estadoCuestionario: EstadoCuestionario;
  createdAt:          string;
  creadoPor?:         string;  // nombre y apellido de quien lo creó
  totalPreguntas:     number;
  editable:           boolean;
  // Ventana de disponibilidad
  fechaInicio?:       string;
  fechaFin?:          string;
  disponible?:        boolean;  // PUBLICADO y dentro de la ventana
  // Tiempo límite para responder, en minutos. null/undefined = sin límite.
  tiempoLimiteMinutos?: number | null;
  // Programa objetivo. null = general (todos los estudiantes).
  programaObjetivo?:       string | null;
  programaObjetivoNombre?: string | null; // displayName, ej. "Ingeniería de Sistemas"
}

export interface CuestionarioRequest {
  nombre:          string;
  objetivo?:       string;
  instrucciones?:  string;
  fechaInicio?:    string;  // ISO LocalDateTime (sin zona)
  fechaFin?:       string;
  ordenAleatorio:  boolean;
  tiempoLimiteMinutos?: number | null;
  programaObjetivo?: string | null; // null = general
}

export interface ActualizarCuestionarioRequest {
  nombre?:         string;
  objetivo?:       string;
  instrucciones?:  string;
  fechaInicio?:    string;
  fechaFin?:       string;
  ordenAleatorio?: boolean;
  tiempoLimiteMinutos?: number | null;
  programaObjetivo?: string | null; // null = general
}

export interface PreguntaResponse {
  idPregunta:     number;
  tipoPregunta:   QuestionType;
  texto:          string;
  imagenUrl?:     string;
  description?:   string;
  ayuda?:         string;
  maxOpciones?:   number;
  createdAt:      string;
  updatedAt:      string;
  dimension?:     DimensionResponse;
  opcionPregunta: OptionResponse[];
}

export interface OptionResponse {
  idOpcion:           number;
  texto:              string;
  isCorrecta:         boolean;
  peso:               number;
  ordenVisualizacion: number;
}

// Pregunta tal como está DENTRO de un cuestionario (vista coordinador)
export interface PreguntaDeCuestionarioResponse {
  idPregunta:    number;
  texto:         string;
  tipoPregunta:  QuestionType;
  imagenUrl?:    string;
  ayuda?:        string;
  maxOpciones?:  number;
  obligatoria:   boolean;
  peso:          number;
  isCondicional: boolean;
  dimension?:    DimensionResponse;
  opciones:      OptionResponse[];
}

export interface PreguntaRequest {
  tipoPregunta:           QuestionType;
  texto:                  string;
  imagenUrl?:             string;
  ayuda?:                 string;
  maxOpciones?:           number;
  idDimension?:           number;
  opcionPreguntaRequest?: OpcionPreguntaRequest[];
}

export interface OpcionPreguntaRequest {
  texto:              string;
  // Las soft skills se miden por peso; no existe respuesta correcta/incorrecta.
  // Campo opcional por compatibilidad con el backend.
  isCorrecta?:        boolean;
  peso:               number;
  ordenVisualizacion: number;
}

export interface AddQuestionToQuestionnaireRequest {
  idpregunta:  number;
  obligatoria: boolean;
  peso:        number;
}

export interface QuestionnaireQuestion {
  idPregunta:    number;
  textoPregunta:  string;
  tipoPregunta:  QuestionType;
  obligatorio:     boolean;
  peso:        number;
  isCondicional: boolean;
}

export interface QuestionCondition {
  id:                number;
  idCuestionario:    number;
  triggerIdPregunta: number;
  triggerIdOpcion:   number;
  targetIdPregunta:  number;
}

export interface CondicionPreguntaRequest {
  triggerIdPregunta: number;
  triggerIdOpcion:   number;
  targetIdPregunta:  number;
}

// Extender QuestionnaireQuestion para incluir condiciones
export interface QuestionnaireQuestion {
  idPregunta:           number;
  textoPregunta:        string;
  tipoPregunta:         QuestionType;
  obligatorio:          boolean;
  peso:                 number;
  isCondicional:        boolean;
  dimension?:           DimensionResponse;
  CondicionesActivacion: QuestionCondition[];
}

// Extender QuestionnaireResponse para incluir las preguntas del cuestionario
export interface QuestionnaireWithQuestions extends CuestionarioResponse {
  questions:            QuestionnaireQuestion[];
  conditionalQuestions: QuestionnaireQuestion[];
}