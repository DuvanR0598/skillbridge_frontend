import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  CompleteProfileRequest,
  EngineeringProgramResponse,
  ProfileStatusResponse,
  UsuarioPerfilResponse,
} from '../../core/models/perfil.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private API = environment.apiUrl;

  getMyProfile(): Observable<ApiResponse<UsuarioPerfilResponse>> {
    return this.http.get<ApiResponse<UsuarioPerfilResponse>>(`${this.API}/usuarios/me/perfil`);
  }

  getProfileStatus(): Observable<ApiResponse<ProfileStatusResponse>> {
    return this.http.get<ApiResponse<ProfileStatusResponse>>(`${this.API}/usuarios/me/perfil/estado`);
  }

  updateProfile(req: CompleteProfileRequest): Observable<ApiResponse<UsuarioPerfilResponse>> {
    return this.http.patch<ApiResponse<UsuarioPerfilResponse>>(`${this.API}/usuarios/me/perfil`, req);
  }

  uploadAvatar(file: File): Observable<ApiResponse<UsuarioPerfilResponse>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<UsuarioPerfilResponse>>(
      `${this.API}/usuarios/me/perfil/avatar`,
      form,
    );
  }

  getPrograms(): Observable<ApiResponse<EngineeringProgramResponse[]>> {
    return this.http.get<ApiResponse<EngineeringProgramResponse[]>>(`${this.API}/perfil/programas`);
  }
}
