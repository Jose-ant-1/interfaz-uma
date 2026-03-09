import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MonitoreoDTODetalle, MonitoreoListadoDTO } from '../models/monitoreo.model';

@Injectable({
  providedIn: 'root'
})
export class MonitoreoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/monitoreos';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authData');
    return new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
  }

  // Listados principales
  obtenerTodosLosMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.apiUrl}/all`, { headers: this.getHeaders() });
  }

  getMisMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getColaboraciones(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.apiUrl}/colaboraciones`, { headers: this.getHeaders() });
  }

  // Detalle y configuración
  getMonitoreoPorId(id: number): Observable<MonitoreoDTODetalle> {
    return this.http.get<MonitoreoDTODetalle>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  updateMonitoreo(id: number, payload: any): Observable<MonitoreoDTODetalle> {
    return this.http.put<MonitoreoDTODetalle>(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }

  eliminarMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Usuario y Perfil
  getPerfil(): Observable<any> {
    return this.http.get<any>('http://localhost:8080/api/usuarios/me', { headers: this.getHeaders() });
  }
}
