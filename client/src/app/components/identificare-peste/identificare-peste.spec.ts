import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdentificarePesteComponent } from './identificare-peste';

describe('IdentificarePeste', () => {
  let component: IdentificarePesteComponent;
  let fixture: ComponentFixture<IdentificarePesteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentificarePesteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdentificarePesteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
