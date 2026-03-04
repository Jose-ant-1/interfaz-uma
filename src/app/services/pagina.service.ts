import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pagina } from '../models/pagina.model';

@Injectable({
  providedIn: 'root'
})

export class PaginaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/paginas';

  getPaginas(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(this.apiUrl);
  }

  // ESTE ES EL QUE FALTA: Obtener una sola página por su ID
  getPaginaById(id: number): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.apiUrl}/${id}`);
  }

  createPagina(pagina: Pagina): Observable<Pagina> {
    return this.http.post<Pagina>(this.apiUrl, pagina);
  }

  deletePagina(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Corregimos la URL para que use la variable apiUrl
  updatePagina(id: number, data: any): Observable<Pagina> {
    return this.http.put<Pagina>(`${this.apiUrl}/${id}`, data);
  }
}
