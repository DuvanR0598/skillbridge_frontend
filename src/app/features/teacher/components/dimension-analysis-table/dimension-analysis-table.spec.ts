import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DimensionAnalysisTable } from './dimension-analysis-table';

describe('DimensionAnalysisTable', () => {
  let component: DimensionAnalysisTable;
  let fixture: ComponentFixture<DimensionAnalysisTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DimensionAnalysisTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DimensionAnalysisTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
