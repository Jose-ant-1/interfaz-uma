import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaCard } from './pagina-card';

describe('PaginaCard', () => {
  let component: PaginaCard;
  let fixture: ComponentFixture<PaginaCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginaCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
