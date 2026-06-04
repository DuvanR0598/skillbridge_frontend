// Wrapper estándar que retorna el backend en todos los endpoints
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string;
  timestamp: string;
}
