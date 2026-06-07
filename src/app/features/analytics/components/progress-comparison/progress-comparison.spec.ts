import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressComparison } from './progress-comparison';

describe('ProgressComparison', () => {
  let component: ProgressComparison;
  let fixture: ComponentFixture<ProgressComparison>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressComparison],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressComparison);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
