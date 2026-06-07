import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalationCard } from './escalation-card';

describe('EscalationCard', () => {
  let component: EscalationCard;
  let fixture: ComponentFixture<EscalationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscalationCard],
    }).compileComponents();

    fixture = TestBed.createComponent(EscalationCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
