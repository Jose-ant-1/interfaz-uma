import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {MonitoreoDTODetalle, MonitoreoListadoDTO} from '../models/monitoreo.model';

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

  obtenerTodosLosMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.apiUrl}/all`, {headers: this.getHeaders()});
  }

  getMisMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(this.apiUrl, {headers: this.getHeaders()});
  }

  getColaboraciones(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.apiUrl}/colaboraciones`, {headers: this.getHeaders()});
  }

  getMonitoreoPorId(id: number): Observable<MonitoreoDTODetalle> {
    return this.http.get<MonitoreoDTODetalle>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }

  updateMonitoreo(id: number, payload: any): Observable<MonitoreoDTODetalle> {
    return this.http.put<MonitoreoDTODetalle>(`${this.apiUrl}/${id}`, payload, {headers: this.getHeaders()});
  }

  eliminarMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }

  obtenerTodasLasPaginas(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/paginas', {headers: this.getHeaders()});
  }

  crearMonitoreo(payload: any): Observable<MonitoreoDTODetalle> {
    return this.http.post<MonitoreoDTODetalle>(this.apiUrl, payload, {headers: this.getHeaders()});
  }

  invitacionEnMasa(ids: number[], emails: string[]): Observable<void> {
    const url = `${this.apiUrl}/invitar`;

    // Convertimos la lista de emails a un string separado por comas
    const params = new HttpParams().set('emails', emails.join(','));

    // Enviamos la lista de IDs directamente como el cuerpo (Body) de la petición
    return this.http.put<void>(url, ids, {
      headers: this.getHeaders(),
      params: params
    });
  }

  quitarEnMasa(ids: number[], emails: string[]): Observable<void> {
    const url = `${this.apiUrl}/invitar`;

    const params = new HttpParams().set('emails', emails.join(','));

    // En DELETE, el body se pasa dentro del objeto de opciones
    return this.http.delete<void>(url, {
      headers: this.getHeaders(),
      params: params,
      body: ids
    });
  }

}
