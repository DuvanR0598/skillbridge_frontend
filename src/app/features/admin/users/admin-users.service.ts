import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { UserResponse } from '../../../core/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Lista todos los usuarios (solo ADMIN). */
  listUsers(): Observable<UserResponse[]> {
    return this.http
      .get<ApiResponse<UserResponse[]>>(`${this.API}/usuarios/listar`)
      .pipe(map((res) => res.data ?? []));
  }

  /** Reemplaza los roles de un usuario (solo ADMIN). */
  updateRoles(id: number, roles: string[]): Observable<UserResponse> {
    return this.http
      .put<ApiResponse<UserResponse>>(`${this.API}/usuarios/${id}/roles`, { roles })
      .pipe(map((res) => res.data));
  }

  /** Habilita/deshabilita una cuenta (solo ADMIN). */
  toggleEnabled(id: number): Observable<void> {
    return this.http
      .patch<ApiResponse<void>>(`${this.API}/usuarios/${id}/toggle-enabled`, {})
      .pipe(map(() => undefined));
  }
}
