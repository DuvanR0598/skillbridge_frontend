import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileAcademic } from './profile-academic';

describe('ProfileAcademic', () => {
  let component: ProfileAcademic;
  let fixture: ComponentFixture<ProfileAcademic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileAcademic],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileAcademic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
