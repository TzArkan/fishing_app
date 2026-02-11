import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditCatch } from './edit-catch';

describe('EditCatch', () => {
  let component: EditCatch;
  let fixture: ComponentFixture<EditCatch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCatch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditCatch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
