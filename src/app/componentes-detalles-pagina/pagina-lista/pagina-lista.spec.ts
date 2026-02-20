import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaLista } from './pagina-lista';

describe('PaginaLista', () => {
  let component: PaginaLista;
  let fixture: ComponentFixture<PaginaLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaLista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginaLista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
