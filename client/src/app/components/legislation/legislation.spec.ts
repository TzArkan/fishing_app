import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Legislation } from './legislation';

describe('Legislation', () => {
  let component: Legislation;
  let fixture: ComponentFixture<Legislation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Legislation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Legislation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
