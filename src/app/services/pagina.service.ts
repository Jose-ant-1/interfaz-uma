import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pagina } from '../models/pagina.model';

@Injectable({
  providedIn: 'root'
})
export class PaginaService {
  private http = inject(HttpClient);

  private resource = '/paginas';

  getPaginas(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(this.resource);
  }

  getPaginaById(id: number): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.resource}/${id}`);
  }

  buscarPaginas(termino: string): Observable<Pagina[]> {
    if (!termino.trim()) {
      return this.getPaginas();
    }
    return this.http.get<Pagina[]>(`${this.resource}/buscar?q=${termino}`);
  }

  createPagina(pagina: Partial<Pagina>): Observable<Pagina> {
    return this.http.post<Pagina>(this.resource, pagina);
  }

  updatePagina(id: number, data: Partial<Pagina>): Observable<Pagina> {
    return this.http.put<Pagina>(`${this.resource}/${id}`, data);
  }

  deletePagina(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${id}`);
  }
}
