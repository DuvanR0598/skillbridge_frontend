import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelDistributionChart } from './level-distribution-chart';

describe('LevelDistributionChart', () => {
  let component: LevelDistributionChart;
  let fixture: ComponentFixture<LevelDistributionChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelDistributionChart],
    }).compileComponents();

    fixture = TestBed.createComponent(LevelDistributionChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
