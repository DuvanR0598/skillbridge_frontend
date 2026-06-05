export interface RegistrarRequest {
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
