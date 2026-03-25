import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaUsuario } from '../models/plantilla-usuario';

@Injectable({
  providedIn: 'root',
})
export class PlantillaUsuarioService {
  private http = inject(HttpClient);
  private resource = '/plantillaUsuario';

  findAll(): Observable<PlantillaUsuario[]> {
    return this.http.get<PlantillaUsuario[]>(this.resource);
  }

  findById(id: number): Observable<PlantillaUsuario> {
    return this.http.get<PlantillaUsuario>(`${this.resource}/${id}`);
  }

  create(plantilla: Partial<PlantillaUsuario>): Observable<PlantillaUsuario> {
    return this.http.post<PlantillaUsuario>(this.resource, plantilla);
  }

  update(id: number, plantilla: Partial<PlantillaUsuario>): Observable<PlantillaUsuario> {
    return this.http.put<PlantillaUsuario>(`${this.resource}/${id}`, plantilla);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${id}`);
  }
}
