import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaMonitoreo } from '../models/plantilla-monitoreo';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PlantillaMonitoreoService {
  private readonly http = inject(HttpClient);
  private readonly resource = '/plantillaMonitoreo';

  findAll(): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(this.resource).pipe(
      map(plantillas => plantillas.map(p => ({
        ...p,
        nombre: p.nombre || 'Plantilla sin nombre',
        monitoreos: p.monitoreos || []
      })))
    );
  }

  findByPropietario(usuarioId: number): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(`${this.resource}/propietario/${usuarioId}`).pipe(
      map(plantillas => plantillas.map(p => ({
        ...p,
        nombre: p.nombre || 'Plantilla sin nombre',
        monitoreos: p.monitoreos || []
      })))
    );
  }

  create(plantilla: Partial<PlantillaMonitoreo>): Observable<PlantillaMonitoreo> {
    // PILAR: SANITIZACIÓN (Evita basura en la DB)
    const payload = {
      ...plantilla,
      nombre: plantilla.nombre?.trim() || 'Nueva Plantilla',
      monitoreos: plantilla.monitoreos || []
    };

    return this.http.post<PlantillaMonitoreo>(this.resource, payload).pipe(
      map(res => ({
        ...res,
        // PILAR: INTEGRIDAD (Repara la respuesta para la UI)
        nombre: res.nombre || payload.nombre,
        monitoreos: res.monitoreos || []
      }))
    );
  }

  update(id: number, plantilla: Partial<PlantillaMonitoreo>): Observable<PlantillaMonitoreo> {
    const payload = {
      ...plantilla,
      ...(plantilla.nombre && { nombre: plantilla.nombre.trim() }),
      monitoreos: plantilla.monitoreos || []
    };

    return this.http.put<PlantillaMonitoreo>(`${this.resource}/${id}`, payload).pipe(
      map(res => ({
        ...res,
        nombre: res.nombre || payload.nombre || 'Plantilla actualizada',
        monitoreos: res.monitoreos || []
      }))
    );
  }

  delete(id: number): Observable<void> {
    // PILAR: INTEGRIDAD (Validación preventiva)
    if (id === undefined || id === null) {
      throw new Error('ID requerido para eliminar');
    }

    return this.http.delete<void>(`${this.resource}/${id}`);
  }

}
