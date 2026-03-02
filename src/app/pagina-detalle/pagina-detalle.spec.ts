import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaDetalle } from './pagina-detalle';

describe('PaginaDetalle', () => {
  let component: PaginaDetalle;
  let fixture: ComponentFixture<PaginaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginaDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
