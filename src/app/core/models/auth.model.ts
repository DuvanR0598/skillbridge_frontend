export type TipoIdentificacion = 'CC' | 'TI' | 'CE' | 'PA';

export interface RegistrarRequest {
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceInfo?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  profileCompleted: boolean;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  tipoIdentificacion?: TipoIdentificacion;
  visualizacionTipoIdentificacion?: string;
  numeroIdentificacion?: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  authProvider: 'LOCAL' | 'GOOGLE';
  emailVerified: boolean;
  enabled?: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
}
