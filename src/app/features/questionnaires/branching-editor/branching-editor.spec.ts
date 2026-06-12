import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchingEditor } from './branching-editor';

describe('BranchingEditor', () => {
  let component: BranchingEditor;
  let fixture: ComponentFixture<BranchingEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchingEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(BranchingEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
