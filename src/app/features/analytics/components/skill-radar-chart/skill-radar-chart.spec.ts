import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillRadarChart } from './skill-radar-chart';

describe('SkillRadarChart', () => {
  let component: SkillRadarChart;
  let fixture: ComponentFixture<SkillRadarChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillRadarChart],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillRadarChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
