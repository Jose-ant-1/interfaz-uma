import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaMonitoreo } from '../models/plantilla-monitoreo';

@Injectable({
  providedIn: 'root',
})
export class PlantillaMonitoreoService {
  private http = inject(HttpClient);
  private resource = '/plantillaMonitoreo';

  findAll(): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(this.resource);
  }

  findByPropietario(usuarioId: number): Observable<PlantillaMonitoreo[]> {
    return this.http.get<PlantillaMonitoreo[]>(`${this.resource}/propietario/${usuarioId}`);
  }

  create(plantilla: Partial<PlantillaMonitoreo>): Observable<PlantillaMonitoreo> {
    return this.http.post<PlantillaMonitoreo>(this.resource, plantilla);
  }

  update(id: number, plantilla: Partial<PlantillaMonitoreo>): Observable<PlantillaMonitoreo> {
    return this.http.put<PlantillaMonitoreo>(`${this.resource}/${id}`, plantilla);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${id}`);
  }
}
