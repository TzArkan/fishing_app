import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EncyclopediaComponent } from './encyclopedia';

describe('Encyclopedia', () => {
  let component: EncyclopediaComponent;
  let fixture: ComponentFixture<EncyclopediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EncyclopediaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EncyclopediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
