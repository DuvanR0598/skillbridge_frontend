import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { EngineeringProgramResponse, UsuarioPerfilResponse } from '../../core/models/perfil.model';
import { resolveMediaUrl } from '../../core/utils/media-url';
import { AvatarViewer } from '../../shared/components/avatar-viewer/avatar-viewer';
import { StudentsService, StudentSummary } from './students.service';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    DialogModule,
    AvatarViewer,
  ],
  templateUrl: './students-list.html',
  styleUrl: './students-list.scss',
})
export class StudentsList implements OnInit {
  private svc = inject(StudentsService);
  private http = inject(HttpClient);
  private toast = inject(MessageService);
  private readonly API = environment.apiUrl;

  exporting = signal(false);

  loading = signal(true);
  students = signal<StudentSummary[]>([]);
  programs = signal<EngineeringProgramResponse[]>([]);

  searchText = signal('');
  filterProgram = signal<string>('ALL');

  // Buscador dentro del selector de programa
  programSearch = signal('');

  /** Programas filtrados por coincidencia de palabras (sin acentos/mayúsculas). */
  filteredProgramOptions = computed(() => {
    const term = this.normalize(this.programSearch().trim());
    const list = this.programs();
    if (!term) return list;
    const words = term.split(/\s+/);
    return list.filter((p) => {
      const name = this.normalize(p.displayName);
      return words.every((w) => name.includes(w));
    });
  });

  /** Limpia el buscador al cerrar el panel. */
  onProgramPanelToggle(open: boolean): void {
    if (!open) this.programSearch.set('');
  }

  // Diálogo de perfil (solo lectura)
  showProfileDialog = false;
  profileLoading = signal(false);
  selectedStudent = signal<StudentSummary | null>(null);
  selectedPerfil = signal<UsuarioPerfilResponse | null>(null);

  // Visor de foto a pantalla completa
  viewerUrl = signal<string | null>(null);
  viewerCaption = signal<string | null>(null);

  filtered = computed(() => {
    const term = this.normalize(this.searchText().trim());
    const prog = this.filterProgram();
    const words = term ? term.split(/\s+/) : [];
    return this.students().filter((s) => {
      const okProg = prog === 'ALL' || s.programaIngenieria === prog;
      if (!okProg) return false;
      if (words.length === 0) return true;
      const fullName = this.normalize(`${s.nombre ?? ''} ${s.apellido ?? ''}`);
      return words.every((w) => fullName.includes(w));
    });
  });

  // Paginación (cliente)
  pageIndex = signal(0);
  pageSize = signal(10);

  /** Página actual de la lista filtrada. */
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  /** Cambia el texto de búsqueda y vuelve a la primera página. */
  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.pageIndex.set(0);
  }

  /** Cambia el filtro de programa y vuelve a la primera página. */
  onProgramChange(value: string): void {
    this.filterProgram.set(value);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  ngOnInit(): void {
    this.svc.listStudents().subscribe({
      next: (list) => {
        this.students.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.http
      .get<ApiResponse<EngineeringProgramResponse[]>>(`${this.API}/perfil/programas`)
      .subscribe({
        next: (res) => this.programs.set(res.data ?? []),
        error: () => this.programs.set([]),
      });
  }

  /** Quita acentos y pasa a minúsculas para comparar sin distinción. */
  private normalize(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  idLabel(s: StudentSummary): string {
    const tipo = s.tipoIdentificacion ?? '';
    const num = s.numeroIdentificacion ?? '—';
    return tipo ? `${tipo} ${num}` : num;
  }

  avatarSrc(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
  }

  /** Descarga la lista de estudiantes (con los filtros activos) en XLSX. */
  exportXlsx(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.svc.exportStudents(this.searchText(), this.filterProgram()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estudiantes_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.add({
          severity: 'success',
          summary: 'Exportación lista',
          detail: 'El archivo de estudiantes se descargó correctamente.',
          life: 3000,
        });
      },
      error: () => {
        this.exporting.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: 'Ocurrió un error al generar el archivo.',
          life: 4000,
        });
      },
    });
  }

  /** Abre el visor de la foto de perfil a pantalla completa. */
  openAvatar(): void {
    const url = this.avatarSrc(this.selectedPerfil()?.avatarUrl);
    if (!url) return;
    const st = this.selectedStudent();
    this.viewerCaption.set(st ? `${st.nombre} ${st.apellido}` : null);
    this.viewerUrl.set(url);
  }

  initials(s: StudentSummary): string {
    return `${s.nombre?.[0] ?? ''}${s.apellido?.[0] ?? ''}`.toUpperCase() || '?';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /** Abre el diálogo de solo lectura con el perfil completo del estudiante. */
  openProfile(s: StudentSummary): void {
    this.selectedStudent.set(s);
    this.selectedPerfil.set(null);
    this.showProfileDialog = true;
    this.profileLoading.set(true);
    this.svc.getUserPerfil(s.idUsuario).subscribe({
      next: (perfil) => {
        this.selectedPerfil.set(perfil);
        this.profileLoading.set(false);
      },
      error: () => this.profileLoading.set(false),
    });
  }
}
