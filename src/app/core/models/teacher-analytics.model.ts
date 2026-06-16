export interface ReporteGrupoResponse {
  idCuestionario:                      number;
  nombreCuestionario:                  string;
  generatedAt:                         string;
  totalEstudiantesConPreTest:          number;
  totalEstudiantesConPostTest:         number;
  totalEstudiantesCompletados:         number;
  analisiDimensional:                  AnalisisDimensionalResponse[];
  resumenEstudiantes:                  NivelEstudianteResumenResponse[];
  dimensionMasCritica:                 AnalisisDimensionalResponse | null;
  dimensionMasMejorada:                AnalisisDimensionalResponse | null;
  pcAlcanzadoCualquierNivelAvanzado:   number;
  pcTotalAvanzado:                     number;
}

export interface AnalisisDimensionalResponse {
  skill:                 string;
  idDimension?:          number | null;
  dimensionNombre?:      string | null;
  avgPrePorcentaje:      number;
  avgPostPorcentaje:     number;
  avgDelta:              number;
  preDistribucion:       DistribucionNivelesResponse;
  postDistribucion:      DistribucionNivelesResponse;
  estudiantesMejorados:      number;
  estudiantesEstancados:     number;
  estudiantesRetrocedieron:  number;
  totalEstudiantes:  number;
  masCritico:        boolean;
  masMejoro:         boolean;
}

export interface DistribucionNivelesResponse {
  skill:                   string;
  idDimension?:            number | null;
  dimensionNombre?:        string | null;
  fase:                    string;
  recuentoBasico:          number;
  recuentoIntermedio:      number;
  recuentoAvanzado:        number;
  totalEstudiantes:        number;
  porcentajeBasico:        number;
  porcentajeIntermedio:    number;
  porcentajeAvanzado:      number;
}

export interface NivelEstudianteResumenResponse {
  idEstudiante:      number;
  nombreCompleto?:   string | null;
  email?:            string | null;
  idEvaluacion?:     number;
  skill:             string;
  idDimension?:      number | null;
  dimensionNombre?:  string | null;
  fase:              string;
  totalPuntaje:      number;
  maxPosiblePuntaje: number;
  puntajePorcentaje: number;
  nivel:             string;
}

export interface CompletionStats {
  idCuestionario:             number;
  estudiantesConPreTest:      number;
  estudiantesConPostTest:     number;
  estudiantesConAmbasFases:   number;
  tasaCompleto:               number;
  tasaAbandono:               number;
}

export interface EstudianteQueNecesitaApoyoResponse {
  idEstudiante:            number;
  nombreCompleto?:         string | null;
  email?:                  string | null;
  idPreTestEvaluacion:     number;
  dimensionBaja: {
    skill:          string;
    idDimension?:     number | null;
    dimensionNombre?: string | null;
    puntaje:        number;
    porcentaje:     number;
  }[];
}

export interface QuestionnaireSummary {
  idCuestionario:                        number;
  nombreCuestionario:                    string;
  estado:                                string;
  generatedAt:                           string;
  totalEstudiantesConPreTest:            number;
  totalEstudiantesConPostTest:           number;
  TotalCompletadoAmbasFases:             number;
  tasaFinalizacion:                      number;
  avgPrePorcentaje:                      number;
  avgPostPorcentaje:                     number;
  avgDelta:                              number;
  pctMejorado:                           number;
  EstudiantesElegiblesParaCertificacion: number;
  estudiantesQueNecesitanSerReadmitidos: number;
}