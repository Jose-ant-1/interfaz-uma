import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pagina } from '../models/pagina.model';

@Injectable({
  providedIn: 'root'
})
export class PaginaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/paginas';

  // Lógica para BasicAuth (IDÉNTICA a tu MonitoreoService)
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authData'); // Aquí guardas "usuario:password" en base64
    return new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
  }

  getPaginas(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getPaginaById(id: number): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createPagina(pagina: Pagina): Observable<Pagina> {
    return this.http.post<Pagina>(this.apiUrl, pagina, { headers: this.getHeaders() });
  }

  updatePagina(id: number, data: any): Observable<Pagina> {
    return this.http.put<Pagina>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deletePagina(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
