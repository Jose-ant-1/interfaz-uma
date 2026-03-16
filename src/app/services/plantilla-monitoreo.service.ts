import { inject, Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaMonitoreo } from '../models/plantilla-monitoreo'; // Ajusta la ruta

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

  findAll(): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(this.apiUrl, {headers: this.getHeaders()});
  }

  // NUEVO: Método para obtener una sola plantilla por ID
  findById(id: number): Observable<PlantillaMonitoreo> {
    return this.http.get<PlantillaMonitoreo>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }

  findByPropietario(usuarioId: number): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(`${this.apiUrl}/propietario/${usuarioId}`, {headers: this.getHeaders()});
  }

  create(plantilla: PlantillaMonitoreo): Observable<PlantillaMonitoreo> {
    return this.http.post<PlantillaMonitoreo>(this.apiUrl, plantilla, {headers: this.getHeaders()});
  }

  // NUEVO: Método para actualizar
  update(id: number, plantilla: PlantillaMonitoreo): Observable<PlantillaMonitoreo> {
    return this.http.put<PlantillaMonitoreo>(`${this.apiUrl}/${id}`, plantilla, {headers: this.getHeaders()});
  }

  aplicarPlantillaAUsuario(plantillaId: number, email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${plantillaId}/aplicar`, {email}, {headers: this.getHeaders()});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }

  // En plantilla-monitoreo.service.ts
  revocarPlantillaAUsuario(plantillaId: number, email: string): Observable<void> {
    const params = new HttpParams().set('email', email);
    return this.http.delete<void>(`${this.apiUrl}/${plantillaId}/revocar`, {
      headers: this.getHeaders(),
      params: params
    });
  }

}
