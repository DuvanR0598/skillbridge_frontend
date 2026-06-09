export type EstadoCuestionario =
  | 'BORRADOR' | 'COMPLETO' | 'PUBLICADO' | 'ARCHIVADO' | 'ELIMINADO';

export type QuestionType =
  | 'VERDADERO_FALSO' | 'LIKERT' | 'OPCION_UNICA'
  | 'OPCION_MULTIPLE' | 'DESCRIPCION';

export interface CuestionarioResponse {
  idCuestionario:     number;
  nombre:             string;
  objetivo?:          string;
  instrucciones?:     string;
  fechaCreacion?:     string;
  ordenAleatorio:     boolean;
  estadoCuestionario: EstadoCuestionario;
  createdAt:          string;
  totalPreguntas:     number;
  editable:           boolean;
  // Ventana de disponibilidad
  fechaInicio?:       string;
  fechaFin?:          string;
  disponible?:        boolean;  // PUBLICADO y dentro de la ventana
  // ⚠️ Aún no existen en el backend (se ignoran); opcionales hasta implementarlos
  appPeriodStart?:    string;
  appPeriodEnd?:      string;
  responsibleUserId?: number;
  targetPopulation?:  string;
}

export interface CuestionarioRequest {
  nombre:          string;
  objetivo?:       string;
  instrucciones?:  string;
  fechaInicio?:    string;  // ISO LocalDateTime (sin zona)
  fechaFin?:       string;
  ordenAleatorio:  boolean;
}

export interface ActualizarCuestionarioRequest {
  nombre?:         string;
  objetivo?:       string;
  instrucciones?:  string;
  fechaInicio?:    string;
  fechaFin?:       string;
  ordenAleatorio?: boolean;
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
  opcionPregunta: OpcionResponse[];
}

export interface OpcionResponse {
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
  opciones:      OpcionResponse[];
}

export interface PreguntaRequest {
  tipoPregunta:           QuestionType;
  texto:                  string;
  imagenUrl?:             string;
  ayuda?:                 string;
  maxOpciones?:           number;
  opcionPreguntaRequest?: OpcionPreguntaRequest[];
}

export interface OpcionPreguntaRequest {
  texto:              string;
  isCorrecta:         boolean;
  peso:               number;
  ordenVisualizacion: number;
}

export interface AddQuestionToQuestionnaireRequest {
  idpregunta:  number;
  obligatoria: boolean;
  peso:        number;
}

export interface QuestionnaireQuestion {
  questionId:    number;
  questionText:  string;
  questionType:  QuestionType;
  mandatory:     boolean;
  weight:        number;
  isConditional: boolean;
}