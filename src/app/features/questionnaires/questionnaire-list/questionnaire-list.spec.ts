import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionnaireList } from './questionnaire-list';

describe('QuestionnaireList', () => {
  let component: QuestionnaireList;
  let fixture: ComponentFixture<QuestionnaireList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionnaireList],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionnaireList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
