import { Component, signal } from '@angular/core';
import { PaginaCard } from '../pagina-card/pagina-card'; // Ajusta ruta

@Component({
  selector: 'app-pagina-lista',
  standalone: true,
  imports: [PaginaCard],
  templateUrl: './pagina-lista.html',
})
export class PaginaLista {
  userRole = signal('ADMIN'); // Temporal

  // Simulamos lo que mandaría la API
  paginas = signal([
    { id: 1, nombre: 'Mi Web Personal', url: 'www.arturo.com' },
    { id: 2, nombre: 'Tienda Online', url: 'www.tienda.es' }
  ]);
}
