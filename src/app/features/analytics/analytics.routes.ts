import { Routes } from '@angular/router';

export const analyticsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./student-progress/student-progress').then((m) => m.StudentProgress),
  },
];
