// src/app/features/teacher/teacher.routes.ts
import { Routes } from '@angular/router';

export const teacherRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'group-report/:questionnaireId',
    loadComponent: () =>
      import('./group-report/group-report').then((m) => m.GroupReportComponent),
  },
];
