import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlantillaUsuario } from '../models/plantilla-usuario';

@Injectable({
  providedIn: 'root',
})
export class PlantillaUsuarioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/plantillaUsuario';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authData');
    return new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
  }

  // Obtener todos los grupos de usuarios
  findAll(): Observable<PlantillaUsuario[]> {
    return this.http.get<PlantillaUsuario[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtener un grupo por ID
  findById(id: number): Observable<PlantillaUsuario> {
    return this.http.get<PlantillaUsuario>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Crear un nuevo grupo de usuarios
  create(plantilla: PlantillaUsuario): Observable<PlantillaUsuario> {
    return this.http.post<PlantillaUsuario>(this.apiUrl, plantilla, { headers: this.getHeaders() });
  }

  // Eliminar un grupo
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Si en el futuro necesitas añadir/quitar usuarios de un grupo existente
  update(id: number, plantilla: PlantillaUsuario): Observable<PlantillaUsuario> {
    return this.http.put<PlantillaUsuario>(`${this.apiUrl}/${id}`, plantilla, { headers: this.getHeaders() });
  }
}
