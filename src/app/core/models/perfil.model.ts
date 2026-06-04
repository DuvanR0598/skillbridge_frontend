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
  studentCode?: string;
  academicYear?: number;
}

export interface UserProfileResponse {
  id: number;
  userId: number;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  genderDisplay?: string;
  biography?: string;
  engineeringProgram?: EngineeringProgram;
  engineeringProgramDisplay?: string;
  academicSemester?: number;
  studentCode?: string;
  academicYear?: number;
  profileComplete: boolean;
  completionPercentage: number;
  updatedAt: string;
}

export interface ProfileStatusResponse {
  profileComplete: boolean;
  completionPercentage: number;
  missingRequiredFields: string[];
  missingOptionalFields: string[];
  message: string;
}

export interface EngineeringProgramResponse {
  value: EngineeringProgram;
  displayName: string;
}
