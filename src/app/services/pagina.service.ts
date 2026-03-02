import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pagina } from '../models/pagina.model';

@Injectable({
  providedIn: 'root'
})
export class PaginaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/paginas'; // Ajusta a tu URL de Spring Boot

  // Este método servirá para ambos roles gracias a que
  // el Interceptor ya envía quién eres.
  getPaginas(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(this.apiUrl);
  }

  // Ejemplo de CRUD que solo podrá ejecutar el ADMIN (el backend lo validará)
  createPagina(pagina: Pagina): Observable<Pagina> {
    return this.http.post<Pagina>(this.apiUrl, pagina);
  }

  deletePagina(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
