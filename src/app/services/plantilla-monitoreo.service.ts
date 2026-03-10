import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlantillaMonitoreoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/plantillaMonitoreo';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authData');
    return new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
  }

  // Obtener todas las plantillas (útil para admin)
  findAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtener las plantillas que un usuario puede usar (las que él domina)
  findByPropietario(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/propietario/${usuarioId}`, { headers: this.getHeaders() });
  }

  // La joya de la corona: Aplicar la plantilla a un usuario
  aplicarPlantillaAUsuario(plantillaId: number, email: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${plantillaId}/aplicar`,
      { email: email },
      { headers: this.getHeaders() }
    );
  }

  // Métodos básicos de gestión
  create(plantilla: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, plantilla, { headers: this.getHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
