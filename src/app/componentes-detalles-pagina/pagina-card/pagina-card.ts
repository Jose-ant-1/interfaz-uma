import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pagina-card',
  standalone: true,
  imports: [], // Si usas botones o iconos de otros módulos, van aquí
  templateUrl: './pagina-card.html',
})
export class PaginaCard {
  @Input({ required: true }) pagina: any;
  @Input() isAdmin: boolean = true;
}
