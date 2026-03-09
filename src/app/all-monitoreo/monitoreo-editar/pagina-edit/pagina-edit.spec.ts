import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaEdit } from './pagina-edit';

describe('PaginaEdit', () => {
  let component: PaginaEdit;
  let fixture: ComponentFixture<PaginaEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginaEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
