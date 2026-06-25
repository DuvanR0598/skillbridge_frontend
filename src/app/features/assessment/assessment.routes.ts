import { Routes } from '@angular/router';

export const assessmentRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./assessment-list/assessment-list')
        .then(m => m.AssessmentList)
  },
  {
    path: ':questionnaireId/play',
    loadComponent: () =>
      import('./assessment-player/assessment-player')
        .then(m => m.AssessmentPlayer)
  },
  {
    path: ':assessmentId/result',
    loadComponent: () =>
      import('./assessment-result/assessment-result')
        .then(m => m.AssessmentResult)
  }
];