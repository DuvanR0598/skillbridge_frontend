import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsSupportList } from './students-support-list';

describe('StudentsSupportList', () => {
  let component: StudentsSupportList;
  let fixture: ComponentFixture<StudentsSupportList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsSupportList],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsSupportList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
