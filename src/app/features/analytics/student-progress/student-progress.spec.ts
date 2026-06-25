import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentProgress } from './student-progress';

describe('StudentProgress', () => {
  let component: StudentProgress;
  let fixture: ComponentFixture<StudentProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentProgress],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentProgress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
