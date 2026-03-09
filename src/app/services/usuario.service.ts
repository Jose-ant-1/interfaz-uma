import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/usuarios';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authData');
    return new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
  }

  // --- MÉTODOS DE PERFIL (USUARIO ACTUAL) ---

  getPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/me`, { headers: this.getHeaders() });
  }

  updatePerfil(usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/me`, usuario, { headers: this.getHeaders() });
  }

  updatePassword(password: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/me`, { contrasenia: password }, { headers: this.getHeaders() });
  }

  // --- MÉTODOS DE ADMINISTRACIÓN (CRUD GENERAL) ---

  // Obtener todos los usuarios
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtener un usuario específico por ID
  getUsuarioById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Crear un nuevo usuario (POST)
  crearUsuario(usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario, { headers: this.getHeaders() });
  }

  // Actualizar cualquier usuario por ID (PUT)
  updateUsuario(id: number, usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario, { headers: this.getHeaders() });
  }

  // Eliminar un usuario (DELETE)
  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
