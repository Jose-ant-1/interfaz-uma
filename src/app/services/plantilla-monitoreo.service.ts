import { inject, Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaMonitoreo } from '../models/plantilla-monitoreo';

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

  findByPropietario(usuarioId: number): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(`${this.apiUrl}/propietario/${usuarioId}`, {headers: this.getHeaders()});
  }

  create(plantilla: PlantillaMonitoreo): Observable<PlantillaMonitoreo> {
    return this.http.post<PlantillaMonitoreo>(this.apiUrl, plantilla, {headers: this.getHeaders()});
  }

  update(id: number, plantilla: PlantillaMonitoreo): Observable<PlantillaMonitoreo> {
    return this.http.put<PlantillaMonitoreo>(`${this.apiUrl}/${id}`, plantilla, {headers: this.getHeaders()});
  }


  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }


}
