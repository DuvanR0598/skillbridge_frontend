export type EvaluacionFase  = 'PRE_TEST' | 'POST_TEST';
export type EvaluacionEstado = 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
export type QuestionType     =
  | 'VERDADERO_FALSO' | 'LIKERT' | 'OPCION_UNICA'
  | 'OPCION_MULTIPLE' | 'DESCRIPCION';

// ── Entrega del cuestionario al estudiante ─────────────────────
export interface CuestionarioEntregaResponse {
  idCuestionario:         number;
  nombre:                 string;
  objetivo:               string;
  instrucciones?:         string;
  ordenAleatorio:         boolean;
  totalPreguntas:         number;
  preguntas:              PreguntaEntregaResponse[];
  preguntasCondicionales: PreguntaEntregaResponse[];
}

export interface PreguntaEntregaResponse {
  idPregunta:         number;
  numeroPregunta:     number | null;
  tipoPregunta:       QuestionType;
  texto:              string;
  imagenUrl?:         string;
  ayuda?:             string;
  obligatoria:        boolean;
  maxOpciones?:       number;
  opciones:           OpcionPreguntaResponse[];
  activarCondiciones: ActivarCondicionPreguntaResponse[];
}

export interface OpcionPreguntaResponse {
  idOpcion:     number;
  texto:         string;
  ordenVisualizacion: number;
}

export interface ActivarCondicionPreguntaResponse {
  idCondicion:       number;
  triggerIdPregunta: number;
  triggerIdOpcion:   number;
}

// ── Sesión de evaluación ───────────────────────────────────────
export interface EvaluacionEstudianteResponse {
  id:                  number;
  idEstudiante:        number;
  idCuestionario:      number;
  nombreCuestionario:  string;
  evaluacionFase:      EvaluacionFase;
  estado:              EvaluacionEstado;
  numeroIntento:       number;
  startedAt:           string;
  finishedAt?:         string;
  totalRespuestas:     number;
  respuestas?:         DetalleRespuestaResponse[];
}

export interface DetalleRespuestaResponse {
  id:                        number;
  idPregunta:                number;
  textoPregunta?:            string;
  idsOpcionesSeleccionadas?: number[];
  respuestaAbierta?:         string;
  puntajeObtenido?:          number;
  answeredAt?:               string;
}

export interface StartAssessmentRequest {
  evaluacionFase: EvaluacionFase;
}

export interface EnviarRespuestaRequest {
  idPregunta:                number;
  idsOpcionesSeleccionadas?: number[];
  respuestaAbierta?:         string;
}

// ── Reporte final ──────────────────────────────────────────────
export interface InformeEvaluacionResponse {
  idEvaluacion:       number;
  idEstudiante:       number;
  nombreCuestionario: string;
  evaluacionFase:     EvaluacionFase;
  numeroIntento:      number;
  startedAt:          string;
  finishedAt:         string;
  resumenGeneral:     string;
  resultados:         PuntuacionResultadoResponse[];
}

export interface PuntuacionResultadoResponse {
  id:                          number;
  skill:                       string;
  dimension:                   string | null;
  totalPuntaje:                number;
  maxPuntuacionPosible:        number;
  porcentajePuntuacion:        number;
  nivel:                       'BAJO' | 'INTERMEDIO' | 'AVANZADO' | null;
  descripcionNivel?:           string;
  caracteristicasObservables?: string;
  planesAsignados:             AssignedPlan[];
  calculatedAt:                string;
}

export interface AssignedPlan {
  id:          number;
  planAxis:    'ACADEMICO' | 'EXPERIMENTAL' | 'PERSONAL';
  titulo:      string;
  descripcion: string;
  tipoAccion:  'LEER' | 'VER' | 'PRACTICAR';
  recursos:    string[];
}