// Nombre (enum) del programa de ingeniería. El backend define el catálogo
// completo (enum ProgramaIngenieria); el frontend lo consume vía /perfil/programas,
// por lo que se modela como string para no duplicar los 33 valores aquí.
export type EngineeringProgram = string;

export type Gender = 'MASCULINO' | 'FEMENINO' | 'NO_BINARIO' | 'PREFIERO_NO_DECIRLO';

export interface CompleteProfileRequest {
  dateOfBirth?: string; // formato: YYYY-MM-DD
  gender?: Gender;
  biography?: string;
  engineeringProgram?: EngineeringProgram;
  academicSemester?: number;
  // Solo para usuarios sin documento (ej. registrados con Google)
  tipoIdentificacion?: 'CC' | 'TI' | 'CE' | 'PA';
  numeroIdentificacion?: string;
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
  codigoProgramaIngenieria?: string;
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
  codigo: string;
  displayName: string;
}
