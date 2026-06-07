import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssessmentPlayer } from './assessment-player';

describe('AssessmentPlayer', () => {
  let component: AssessmentPlayer;
  let fixture: ComponentFixture<AssessmentPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentPlayer],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentPlayer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
