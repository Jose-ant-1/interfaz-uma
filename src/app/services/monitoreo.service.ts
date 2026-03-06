import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// Importa tus interfaces aquí (deberías crearlas para tipar bien)
// import { MonitoreoDTODetalle, MonitoreoListadoDTO } from '../models/monitoreo.model';

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

  // Ahora devuelve MonitoreoListadoDTO[]
  obtenerTodosLosMonitoreos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`, { headers: this.getHeaders() });
  }

  // Ahora devuelve MonitoreoListadoDTO[]
  getMisMonitoreos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Ahora devuelve MonitoreoListadoDTO[]
  getColaboraciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/colaboraciones`, { headers: this.getHeaders() });
  }

  // Ahora devuelve MonitoreoDTODetalle
  getMonitoreoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getPaginaPorMonitoreo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/pagina`, { headers: this.getHeaders() });
  }

  checkAhora(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/check`, {}, { headers: this.getHeaders() });
  }

  eliminarMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getPerfil(): Observable<any> {
    // Este endpoint debe coincidir con tu controlador de usuarios en el backend
    return this.http.get<any>('http://localhost:8080/api/usuarios/me', { headers: this.getHeaders() });
  }

  updateMonitoreo(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }
}
