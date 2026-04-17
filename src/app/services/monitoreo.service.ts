import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MonitoreoDTODetalle, MonitoreoListadoDTO } from '../models/monitoreo.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MonitoreoService {
  private readonly http = inject(HttpClient);

  private readonly resource = '/monitoreos';

  getMisMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(this.resource).pipe(
      map(monitoreos => monitoreos.map(m => ({
        id: m.id,
        nombre: m.nombre,
        propietarioId: m.propietarioId,
        ultimoEstado: m.ultimoEstado,
        fechaUltimaRevision: m.fechaUltimaRevision,
        activo: m.activo,
        paginaUrl: m.paginaUrl
      })))
    );
  }

  obtenerTodosLosMonitoreos(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.resource}/all`).pipe(
      map(monitoreos => {
        // Si monitoreos es null o undefined, devolvemos null (o [] según prefieras)
        if (!monitoreos) return null as any;

        return monitoreos.map(m => ({
          id: m.id,
          nombre: m.nombre,
          propietarioId: m.propietarioId,
          ultimoEstado: m.ultimoEstado,
          fechaUltimaRevision: m.fechaUltimaRevision,
          activo: m.activo,
          paginaUrl: m.paginaUrl
        }));
      })
    );
  }

  getColaboraciones(): Observable<MonitoreoListadoDTO[]> {
    return this.http.get<MonitoreoListadoDTO[]>(`${this.resource}/colaboraciones`).pipe(
      map(monitoreos => {
        // Protección contra nulos (Evita el error de "Cannot read properties of null")
        if (!monitoreos) return null as any;

        // Mapeo Seguro (Lógica de Negocio: solo pasan los campos oficiales)
        return monitoreos.map(m => ({
          id: m.id,
          nombre: m.nombre,
          propietarioId: m.propietarioId,
          ultimoEstado: m.ultimoEstado,
          fechaUltimaRevision: m.fechaUltimaRevision,
          activo: m.activo,
          paginaUrl: m.paginaUrl
        }));
      })
    );
  }

  getMonitoreoPorId(id: number): Observable<MonitoreoDTODetalle> {
    return this.http.get<MonitoreoDTODetalle>(`${this.resource}/${id}`).pipe(
      map(m => {
        if (!m) return null as any;

        // Mapeo Seguro: Reconstruimos el objeto de detalle
        return {
          id: m.id,
          nombre: m.nombre,
          minutos: m.minutos,
          repeticiones: m.repeticiones,
          propietario: m.propietario, // Aquí podrías mapear también el UsuarioDTO si quisieras
          ultimoEstado: m.ultimoEstado,
          fechaUltimaRevision: m.fechaUltimaRevision,
          activo: m.activo,
          invitados: m.invitados || [],
          paginaUrl: m.paginaUrl
        };
      })
    );
  }

  crearMonitoreo(payload: { nombre: string, paginaUrl: string, minutos: number, repeticiones: number }): Observable<MonitoreoDTODetalle> {
    // Sanitización preventiva: Limpiamos espacios en blanco antes de enviar
    const limpio = {
      ...payload,
      nombre: payload.nombre?.trim(),
      paginaUrl: payload.paginaUrl?.trim()
    };

    return this.http.post<MonitoreoDTODetalle>(this.resource, limpio).pipe(
      map(m => {
        if (!m) return null as any;
        return {
          id: m.id,
          nombre: m.nombre,
          minutos: m.minutos,
          repeticiones: m.repeticiones,
          propietario: m.propietario,
          ultimoEstado: m.ultimoEstado,
          fechaUltimaRevision: m.fechaUltimaRevision,
          activo: m.activo,
          invitados: m.invitados || [],
          paginaUrl: m.paginaUrl
        };
      })
    );
  }

  updateMonitoreo(id: number, payload: Partial<MonitoreoDTODetalle>): Observable<MonitoreoDTODetalle> {
    // Sanitización preventiva para payloads parciales
    const limpio = { ...payload };
    if (limpio.nombre) limpio.nombre = limpio.nombre.trim();
    if (limpio.paginaUrl) limpio.paginaUrl = limpio.paginaUrl.trim();

    return this.http.put<MonitoreoDTODetalle>(`${this.resource}/${id}`, limpio).pipe(
      map(m => {
        if (!m) return null as any;
        return {
          ...m,
          invitados: m.invitados || [] // Garantía de integridad en la respuesta
        };
      })
    );
  }

  eliminarMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${id}`).pipe(
      // Mapeo Seguro: Nos aseguramos de que el componente reciba un flujo limpio
      map(() => {
        return;
      })
    );
  }

  invitacionEnMasa(ids: number[], emails: string[]): Observable<void> {
    // Sanitización: Limpiamos cada email de la lista antes de unirlos
    const emailsLimpios = emails.map(e => e.trim()).join(',');
    const params = new HttpParams().set('emails', emailsLimpios);

    return this.http.put<void>(`${this.resource}/invitar`, ids, { params }).pipe(
      map(() => {
        return; // Garantía de Negocio: devolvemos void consistente
      })
    );
  }

  quitarEnMasa(ids: number[], emails: string[]): Observable<void> {
    // Sanitización: Limpieza de espacios en cada email
    const emailsLimpios = emails.map(e => e.trim()).join(',');
    const params = new HttpParams().set('emails', emailsLimpios);

    // En DELETE, el body va dentro del objeto de configuración
    return this.http.delete<void>(`${this.resource}/invitar`, { params, body: ids }).pipe(
      map(() => {
        return; // Validación de Negocio: devolvemos void consistente
      })
    );
  }
}
