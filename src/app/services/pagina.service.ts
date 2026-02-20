import { Injectable, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Pagina } from '../models/pagina.model';

@Injectable({
  providedIn: 'root'
})
export class PaginaService {

  // Estos son los datos que "fingimos" que vienen de Spring Boot
  private mockPaginas: Pagina[] = [
    { id: 1, nombre: 'Web Principal UMA', url: 'https://uma.es', estado: 'ONLINE' },
    { id: 2, nombre: 'Portal de Alumnos', url: 'https://alumnos.uma.es', estado: 'LENTA' },
    { id: 3, nombre: 'Servidor de Pruebas', url: 'http://localhost:3000', estado: 'ERROR' },
    { id: 4, nombre: 'API Gateway', url: 'https://api.uma.es', estado: 'ONLINE' }
  ];

  getPaginas(): Observable<Pagina[]> {
    // 'of' convierte el array en un Observable, 'delay' simula la espera de red
    return of(this.mockPaginas).pipe(delay(1000));
  }
}
