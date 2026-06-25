import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSecurity } from './profile-security';

describe('ProfileSecurity', () => {
  let component: ProfileSecurity;
  let fixture: ComponentFixture<ProfileSecurity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSecurity],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileSecurity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
