import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionnaireBuilder } from './questionnaire-builder';

describe('QuestionnaireBuilder', () => {
  let component: QuestionnaireBuilder;
  let fixture: ComponentFixture<QuestionnaireBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionnaireBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionnaireBuilder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
