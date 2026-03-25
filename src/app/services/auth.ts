import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, switchMap } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private resource = '/usuarios';

  userRole = signal<string | null>(localStorage.getItem('userRole'));
  userName = signal<string | null>(localStorage.getItem('userName'));
  userId = signal<string | null>(localStorage.getItem('userId'));

  isAuthenticated(): boolean {
    return localStorage.getItem('authData') !== null && this.userRole() !== null;
  }

  login(email: string, pass: string) {
    // Enviamos credenciales al endpoint de login
    return this.http.post<{token: string}>(`${this.resource}/login`, {
      email: email.trim(),
      password: pass
    }).pipe(
      tap(res => {
        // Guardamos el Token con el formato "Bearer"
        localStorage.setItem('authData', `Bearer ${res.token}`);
      }),
      // Una vez tenemos el token, pedimos los datos del usuario logueado
      switchMap(() => this.http.get<Usuario>(`${this.resource}/me`)),
      tap((user) => {
        // Guardamos los datos del perfil
        localStorage.setItem('userRole', user.permiso || 'USER');
        localStorage.setItem('userName', user.nombre || '');
        localStorage.setItem('userId', user.id?.toString() || '');

        this.userRole.set(user.permiso || 'USER');
        this.userName.set(user.nombre);
        this.userId.set(user.id?.toString() || null);
      }),
      catchError(err => {
        this.logout();
        console.error('Error en login:', err);
        throw err;
      })
    );
  }

  logout() {
    localStorage.removeItem('authData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');

    this.userRole.set(null);
    this.userName.set(null);
    this.userId.set(null);
  }

  actualizarDatosTrasCambio(nuevoEmail: string, nuevoNombre: string) {
    this.userName.set(nuevoNombre);
    localStorage.setItem('userName', nuevoNombre);
  }
}
