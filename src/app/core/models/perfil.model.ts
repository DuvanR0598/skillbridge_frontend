export type EngineeringProgram =
  | 'SYSTEMS_ENGINEERING'
  | 'INDUSTRIAL_ENGINEERING'
  | 'CIVIL_ENGINEERING'
  | 'ELECTRONIC_ENGINEERING'
  | 'ELECTRICAL_ENGINEERING'
  | 'MECHANICAL_ENGINEERING'
  | 'BIOMEDICAL_ENGINEERING'
  | 'ENVIRONMENTAL_ENGINEERING'
  | 'CHEMICAL_ENGINEERING'
  | 'AEROSPACE_ENGINEERING'
  | 'TELECOMMUNICATIONS_ENGINEERING'
  | 'OTHER';

export type Gender = 'MASCULINO' | 'FEMENINO' | 'NO_BINARIO' | 'PREFIERO_NO_DECIRLO';

export interface CompleteProfileRequest {
  dateOfBirth?: string; // formato: YYYY-MM-DD
  gender?: Gender;
  biography?: string;
  engineeringProgram?: EngineeringProgram;
  academicSemester?: number;
}

export interface UsuarioPerfilResponse {
  id: number;
  idUsuario: number;
  avatarUrl?: string;
  fechaNacimiento?: string;
  genero?: Gender;
  visualizacionGenero?: string;
  biografia?: string;
  programaIngenieria?: EngineeringProgram;
  visualizacionProgramaIngenieria?: string;
  semestreAcademico?: number;
  perfilCompleto: boolean;
  porcentajeCompleto: number;
  updatedAt: string;
}

export interface ProfileStatusResponse {
  perfilCompleto: boolean;
  porcentajeCompleto: number;
  camposObligatoriosFaltantes: string[];
  camposOpcionalesFaltantes: string[];
  mensaje: string;
}

export interface EngineeringProgramResponse {
  value: EngineeringProgram;
  displayName: string;
}
