import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Usuario, UsuarioDTO} from '../models/usuario.model';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly http = inject(HttpClient);

  private readonly resource = '/usuarios';

  buscarUsuarios(termino: string): Observable<UsuarioDTO[]> {
    // PILAR: SANITIZACIÓN (Limpieza del término antes de enviarlo)
    const query = (termino || '').trim();

    return this.http.get<UsuarioDTO[]>(`${this.resource}/buscar?q=${query}`).pipe(
      // PILAR: INTEGRIDAD (Aseguramos que la lista sea robusta para la UI)
      map(usuarios => (usuarios || []).map(u => ({
        ...u,
        nombre: u.nombre || 'Usuario sin nombre',
        permiso: u.permiso || 'USER'
      })))
    );
  }

  getPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.resource}/me`).pipe(
      // PILAR: INTEGRIDAD (Aseguramos que el perfil nunca rompa la UI)
      map(perfil => ({
        ...perfil,
        nombre: perfil.nombre || 'Usuario',
        permiso: perfil.permiso || 'GUEST'
      }))
    );
  }

  updatePerfil(usuario: Partial<Usuario>): Observable<Usuario> {
    // PILAR: SANITIZACIÓN (Pre-envío)
    const payload: Partial<Usuario> = {
      ...usuario,
      ...(usuario.nombre && { nombre: usuario.nombre.trim() }),
      ...(usuario.email && { email: usuario.email.trim().toLowerCase() })
    };

    return this.http.put<Usuario>(`${this.resource}/me`, payload).pipe(
      // PILAR: INTEGRIDAD (Post-respuesta)
      map(res => ({
        ...res,
        nombre: res.nombre || 'Usuario',
        permiso: res.permiso || 'GUEST'
      }))
    );
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.resource).pipe(
      // PILAR: INTEGRIDAD (Blindaje de colección)
      map(usuarios => (usuarios || []).map(u => ({
        ...u,
        nombre: u.nombre || 'Sin nombre',
        email: u.email || 'sin@email.com',
        permiso: u.permiso || 'USER'
      })))
    );
  }

  getUsuarioById(id: number): Observable<Usuario> {
    // PILAR: ROBUSTEZ (Validación de entrada)
    if (id === null || id === undefined) {
      throw new Error('ID de usuario no proporcionado');
    }

    return this.http.get<Usuario>(`${this.resource}/${id}`).pipe(
      // PILAR: INTEGRIDAD (Aseguramos que el detalle sea completo)
      map(u => ({
        ...u,
        nombre: u.nombre || 'Usuario sin nombre',
        email: u.email || 'sin@email.com',
        permiso: u.permiso || 'USER'
      }))
    );
  }

  crearUsuario(usuario: Partial<Usuario>): Observable<Usuario> {
    // PILAR: SANITIZACIÓN (Pre-envío)
    const payload = {
      ...usuario,
      nombre: usuario.nombre?.trim() || 'Nuevo Usuario',
      email: usuario.email?.trim().toLowerCase() || '',
      permiso: usuario.permiso || 'USER'
    };

    return this.http.post<Usuario>(this.resource, payload).pipe(
      // PILAR: INTEGRIDAD (Post-respuesta)
      map(res => ({
        ...res,
        nombre: res.nombre || payload.nombre,
        permiso: res.permiso || payload.permiso
      }))
    );
  }

  updateUsuario(id: number, usuario: Partial<Usuario>): Observable<Usuario> {
    // PILAR: ROBUSTEZ (Validación de entrada)
    if (!id) throw new Error('ID requerido para actualizar usuario');

    // PILAR: SANITIZACIÓN (Limpieza de campos clave)
    const payload = {
      ...usuario,
      ...(usuario.nombre && { nombre: usuario.nombre.trim() }),
      ...(usuario.email && { email: usuario.email.trim().toLowerCase() })
    };

    return this.http.put<Usuario>(`${this.resource}/${id}`, payload).pipe(
      // PILAR: INTEGRIDAD (Garantizamos un objeto completo para la UI)
      map(res => ({
        ...res,
        nombre: res.nombre || payload.nombre || 'Usuario actualizado',
        permiso: res.permiso || 'USER'
      }))
    );
  }

  eliminarUsuario(id: number): Observable<void> {
    // PILAR: ROBUSTEZ (Validación preventiva)
    if (id === null || id === undefined) {
      throw new Error('ID requerido para eliminar el usuario');
    }

    return this.http.delete<void>(`${this.resource}/${id}`);
  }

}
