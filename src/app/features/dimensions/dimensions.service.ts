import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { DimensionRequest, DimensionResponse, SkillTipo } from '../../core/models/dimension.model';

@Injectable({ providedIn: 'root' })
export class DimensionsService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  list(skill?: SkillTipo): Observable<DimensionResponse[]> {
    let params = new HttpParams();
    if (skill) params = params.set('skill', skill);
    return this.http
      .get<ApiResponse<DimensionResponse[]>>(`${this.API}/dimension/listar`, { params })
      .pipe(map((res) => res.data ?? []));
  }

  create(req: DimensionRequest): Observable<DimensionResponse> {
    return this.http
      .post<ApiResponse<DimensionResponse>>(`${this.API}/dimension/crear`, req)
      .pipe(map((res) => res.data));
  }

  update(id: number, req: DimensionRequest): Observable<DimensionResponse> {
    return this.http
      .put<ApiResponse<DimensionResponse>>(`${this.API}/dimension/${id}`, req)
      .pipe(map((res) => res.data));
  }

  remove(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.API}/dimension/${id}`)
      .pipe(map(() => undefined));
  }
}
