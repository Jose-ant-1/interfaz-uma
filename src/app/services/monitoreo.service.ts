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

  // Listados principales
  obtenerTodosLosMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.apiUrl}/all`, {headers: this.getHeaders()});
  }

  getMisMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(this.apiUrl, {headers: this.getHeaders()});
  }

  getColaboraciones(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.apiUrl}/colaboraciones`, {headers: this.getHeaders()});
  }

  // Detalle y configuración
  getMonitoreoPorId(id: number): Observable<MonitoreoDTODetalle> {
    return this.http.get<MonitoreoDTODetalle>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }

  updateMonitoreo(id: number, payload: any): Observable<MonitoreoDTODetalle> {
    return this.http.put<MonitoreoDTODetalle>(`${this.apiUrl}/${id}`, payload, {headers: this.getHeaders()});
  }

  eliminarMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {headers: this.getHeaders()});
  }

  // Usuario y Perfil
  getPerfil(): Observable<any> {
    return this.http.get<any>('http://localhost:8080/api/usuarios/me', {headers: this.getHeaders()});
  }

  // --- GESTIÓN DE INVITADOS ---

  // Llama al @PutMapping("/{id}/invitar") de tu MonitoreoController
  invitarUsuario(monitoreoId: number, email: string): Observable<MonitoreoDTODetalle> {
    const url = `${this.apiUrl}/${monitoreoId}/invitar`;
    // Enviamos el email en el BODY, que es lo que espera el Map<String, String> del Back
    return this.http.put<MonitoreoDTODetalle>(url, { email }, { headers: this.getHeaders() });
  }

  // Llama al nuevo endpoint DELETE que deberías tener para quitar el acceso
  // Si tu back usa el mismo PUT para hacer toggle, cámbialo aquí.
  quitarInvitado(monitoreoId: number, email: string): Observable<MonitoreoDTODetalle> {
    const url = `${this.apiUrl}/${monitoreoId}/invitar`;

    // Usamos HttpParams para que Angular construya la URL como: /api/monitoreos/1/invitar?email=usuario@correo.com
    const params = new HttpParams().set('email', email);

    return this.http.delete<MonitoreoDTODetalle>(url, {
      headers: this.getHeaders(),
      params: params
    });
  }

  obtenerTodasLasPaginas(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/paginas', {headers: this.getHeaders()});
  }

  crearMonitoreo(payload: any): Observable<MonitoreoDTODetalle> {
    return this.http.post<MonitoreoDTODetalle>(this.apiUrl, payload, {headers: this.getHeaders()});
  }

}
