import { Routes } from '@angular/router';

export const questionnaireRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./questionnaire-list/questionnaire-list')
        .then(m => m.QuestionnaireList)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./questionnaire-form/questionnaire-form')
        .then(m => m.QuestionnaireForm)
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./questionnaire-form/questionnaire-form')
        .then(m => m.QuestionnaireForm)
  },
  {
    path: ':id/builder',
    loadComponent: () =>
      import('./questionnaire-builder/questionnaire-builder')
        .then(m => m.QuestionnaireBuilder)
  },
  {
    path: ':id/preview',
    loadComponent: () =>
      import('./questionnaire-preview/questionnaire-preview')
        .then(m => m.QuestionnairePreview)
  }
];