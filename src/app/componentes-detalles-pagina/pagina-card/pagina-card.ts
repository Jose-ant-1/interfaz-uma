import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pagina-card',
  standalone: true,
  templateUrl: './pagina-card.html',
})
export class PaginaCard {
  @Input({ required: true }) pagina: any;
  @Input() isAdmin: boolean = false; // Por defecto no es admin
}
