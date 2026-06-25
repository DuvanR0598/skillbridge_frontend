import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { UsuarioPerfilResponse } from '../../core/models/perfil.model';

export interface StudentSummary {
  idUsuario: number;
  tipoIdentificacion?: string | null;
  numeroIdentificacion?: string | null;
  nombre: string;
  apellido: string;
  email: string;
  programaIngenieria?: string | null;
  programaNombre?: string | null;
  codigoPrograma?: string | null;
  semestreAcademico?: number | null;
  activado?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Lista los usuarios con rol estudiante (ADMIN/COORDINADOR). */
  listStudents(): Observable<StudentSummary[]> {
    return this.http
      .get<ApiResponse<StudentSummary[]>>(`${this.API}/usuarios/estudiantes`)
      .pipe(map((res) => res.data ?? []));
  }

  /** Perfil detallado de un usuario (ADMIN/COORDINADOR). */
  getUserPerfil(id: number): Observable<UsuarioPerfilResponse> {
    return this.http
      .get<ApiResponse<UsuarioPerfilResponse>>(`${this.API}/usuarios/${id}/perfil`)
      .pipe(map((res) => res.data));
  }

  /** Descarga los estudiantes filtrados en un XLSX (ADMIN/COORDINADOR). */
  exportStudents(search: string, programa: string): Observable<Blob> {
    let params = new HttpParams();
    if (search && search.trim()) params = params.set('search', search.trim());
    if (programa && programa !== 'ALL') params = params.set('programa', programa);
    return this.http.get(`${this.API}/usuarios/estudiantes/exportar`, {
      params,
      responseType: 'blob',
    });
  }
}
