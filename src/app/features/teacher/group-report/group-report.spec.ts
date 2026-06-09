import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupReport } from './group-report';

describe('GroupReport', () => {
  let component: GroupReport;
  let fixture: ComponentFixture<GroupReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupReport],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
