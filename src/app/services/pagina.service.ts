import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pagina } from '../models/pagina.model';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PaginaService {
  private readonly http = inject(HttpClient);

  private readonly resource = '/paginas';

  getPaginas(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(this.resource).pipe(
      map((paginas: Pagina[]) => paginas.map(p => ({
        ...p,
        // Pilar 6: Integridad de Negocio (Mapeo de seguridad)
        nombre: p.nombre || 'Sin nombre',
        url: p.url || '#'
      })))
    );
  }

  getPaginaById(id: number): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.resource}/${id}`).pipe(
      map((pagina: Pagina): Pagina => ({
        ...pagina,
        nombre: pagina.nombre || 'Página sin nombre',
        url: pagina.url || '#'
      }))
    );
  }

  buscarPaginas(termino: string): Observable<Pagina[]> {
    // Pilar 5: Sanitización
    const limpio = termino?.trim() || '';

    // Lógica condicional
    if (!limpio) {
      return this.getPaginas();
    }

    // Petición con mapeo de seguridad (Pilar 6)
    return this.http.get<Pagina[]>(`${this.resource}/buscar?q=${limpio}`).pipe(
      map(paginas => paginas.map(p => ({
        ...p,
        nombre: p.nombre || 'Sin nombre',
        url: p.url || '#'
      })))
    );
  }

  createPagina(pagina: Partial<Pagina>): Observable<Pagina> {
    // Pilar 5: Sanitización antes de enviar
    const nuevaPagina = {
      ...pagina,
      nombre: pagina.nombre?.trim() || 'Nueva Página',
      url: pagina.url?.trim() || '#'
    };

    return this.http.post<Pagina>(this.resource, nuevaPagina).pipe(
      map((res: Pagina): Pagina => ({
        ...res,
        // Pilar 6: Integridad (Aseguramos que la respuesta tenga lo necesario)
        nombre: res.nombre || nuevaPagina.nombre,
        url: res.url || nuevaPagina.url
      }))
    );
  }

  updatePagina(id: number, data: Partial<Pagina>): Observable<Pagina> {
    // Pilar 5: Sanitización (Evitamos enviar strings con puros espacios)
    const dataLimpia = {
      ...data,
      ...(data.nombre && { nombre: data.nombre.trim() }),
      ...(data.url && { url: data.url.trim() })
    };

    return this.http.put<Pagina>(`${this.resource}/${id}`, dataLimpia).pipe(
      map((res: Pagina): Pagina => ({
        ...res,
        // Pilar 6: Integridad de la respuesta
        nombre: res.nombre || 'Página actualizada',
        url: res.url || '#'
      }))
    );
  }

  deletePagina(id: number): Observable<void> {
    // Pilar 2: Caso de Borde / Validación preventiva
    if (id === undefined || id === null) {
      throw new Error('Se requiere un ID válido para eliminar una página');
    }

    return this.http.delete<void>(`${this.resource}/${id}`);
  }

}
