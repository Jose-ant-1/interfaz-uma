import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaUsuario } from '../models/plantilla-usuario';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PlantillaUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly resource = '/plantillaUsuario';

  findAll(): Observable<PlantillaUsuario[]> {
    return this.http.get<PlantillaUsuario[]>(this.resource).pipe(
      map(plantillas => plantillas.map(p => this.sanear(p)))
    );
  }

  private sanear(p: PlantillaUsuario): PlantillaUsuario {
    return {
      ...p,
      nombre: p.nombre || 'Sin nombre',
      usuarios: p.usuarios || [] // Si viene null o undefined, ponemos array vacío
    };
  }

  findById(id: number): Observable<PlantillaUsuario> {
    return this.http.get<PlantillaUsuario>(`${this.resource}/${id}`).pipe(
      map(p => ({
        ...p,
        nombre: p.nombre || 'Sin nombre',
        usuarios: p.usuarios || [] // Pilar: Integridad (Reparación de datos)
      }))
    );
  }

  create(plantilla: Partial<PlantillaUsuario>): Observable<PlantillaUsuario> {
    // PILAR: SANITIZACIÓN Y PROTECCIÓN DE ENVÍO
    const payload = {
      ...plantilla,
      // Limpiamos espacios y aseguramos un valor por defecto
      nombre: plantilla.nombre?.trim() || 'Nueva Plantilla'
    };

    return this.http.post<PlantillaUsuario>(this.resource, payload).pipe(
      // PILAR: INTEGRIDAD (Mapeo de respuesta para la UI)
      map(res => ({
        ...res,
        usuarios: res.usuarios || []
      }))
    );
  }

  update(id: number, plantilla: Partial<PlantillaUsuario>): Observable<PlantillaUsuario> {
    // PILAR: SANITIZACIÓN (Envío)
    const payload = {
      ...plantilla,
      ...(plantilla.nombre && { nombre: plantilla.nombre.trim() })
    };

    return this.http.put<PlantillaUsuario>(`${this.resource}/${id}`, payload).pipe(
      // PILAR: INTEGRIDAD (Respuesta)
      map(res => ({
        ...res,
        nombre: res.nombre || payload.nombre || 'Sin nombre',
        usuarios: res.usuarios || []
      }))
    );
  }

  delete(id: number): Observable<void> {
    // PILAR: ROBUSTEZ (Validación preventiva de entrada)
    if (id === undefined || id === null) {
      throw new Error('ID requerido para eliminar la plantilla');
    }

    return this.http.delete<void>(`${this.resource}/${id}`);
  }
}
