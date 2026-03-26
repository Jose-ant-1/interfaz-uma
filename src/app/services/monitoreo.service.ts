import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MonitoreoDTODetalle, MonitoreoListadoDTO } from '../models/monitoreo.model';

@Injectable({
  providedIn: 'root'
})
export class MonitoreoService {
  private http = inject(HttpClient);

  private resource = '/monitoreos';

  getMisMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(this.resource);
  }

  obtenerTodosLosMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.resource}/all`);
  }

  getColaboraciones(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.resource}/colaboraciones`);
  }

  getMonitoreoPorId(id: number): Observable<MonitoreoDTODetalle> {
    return this.http.get<MonitoreoDTODetalle>(`${this.resource}/${id}`);
  }


  crearMonitoreo(payload: { nombre: string, paginaUrl: string, minutos: number, repeticiones: number }): Observable<MonitoreoDTODetalle> {
    return this.http.post<MonitoreoDTODetalle>(this.resource, payload);
  }

  updateMonitoreo(id: number, payload: Partial<MonitoreoDTODetalle>): Observable<MonitoreoDTODetalle> {
    return this.http.put<MonitoreoDTODetalle>(`${this.resource}/${id}`, payload);
  }

  eliminarMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${id}`);
  }

  invitacionEnMasa(ids: number[], emails: string[]): Observable<void> {
    const params = new HttpParams().set('emails', emails.join(','));
    return this.http.put<void>(`${this.resource}/invitar`, ids, { params });
  }

  quitarEnMasa(ids: number[], emails: string[]): Observable<void> {
    const params = new HttpParams().set('emails', emails.join(','));
    return this.http.delete<void>(`${this.resource}/invitar`, { params, body: ids });
  }
}
