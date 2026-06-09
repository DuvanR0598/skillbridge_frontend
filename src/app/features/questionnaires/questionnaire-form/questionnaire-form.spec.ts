import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionnaireForm } from './questionnaire-form';

describe('QuestionnaireForm', () => {
  let component: QuestionnaireForm;
  let fixture: ComponentFixture<QuestionnaireForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionnaireForm],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionnaireForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
