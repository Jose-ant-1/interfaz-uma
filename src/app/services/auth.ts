import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, switchMap, map, Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly resource = '/usuarios';

  userRole = signal<string | null>(localStorage.getItem('userRole'));
  userName = signal<string | null>(localStorage.getItem('userName'));
  userId = signal<string | null>(localStorage.getItem('userId'));

  isAuthenticated(): boolean {
    const token = localStorage.getItem('authData');
    return (token !== null && token.length > 0) && this.userRole() !== null;
  }

  // Pilar: Integridad Técnica (Tipado explícito de retorno)
  login(email: string, pass: string): Observable<Usuario> {
    return this.http.post<{token: string}>(`${this.resource}/login`, {
      email: email.trim(),
      password: pass
    }).pipe(
      tap(res => localStorage.setItem('authData', `Bearer ${res.token}`)),
      switchMap(() => this.http.get<Usuario>(`${this.resource}/me`)),
      map((user: Usuario): Usuario => ({ // ✅ Tipado en la transformación
        ...user,
        permiso: user.permiso || 'USER',
        nombre: user.nombre || 'Usuario'
      })),
      tap((user: Usuario) => {
        this.persistirSesion(user);
      }),
      catchError(err => {
        this.logout();
        throw err;
      })
    );
  }

  // Método auxiliar para centralizar la persistencia (evita errores TS2339)
  private persistirSesion(user: Usuario): void {
    const role = user.permiso || 'USER';
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', user.nombre);
    localStorage.setItem('userId', user.id?.toString() || '');

    this.userRole.set(role);
    this.userName.set(user.nombre);
    this.userId.set(user.id?.toString() || null);
  }

// auth.ts
  logout() {
    // Pilar 4: Integridad (Limpieza total garantizada)
    const keys = ['authData', 'userRole', 'userName', 'userId'];
    keys.forEach(key => localStorage.removeItem(key));

    // Pilar 6: Robustez (Reset de estado reactivo)
    this.userRole.set(null);
    this.userName.set(null);
    this.userId.set(null);
  }

  actualizarDatosTrasCambio(nuevoEmail: string, nuevoNombre: string) {
    const nombreLimpio = nuevoNombre?.trim() || 'Usuario';

    // Actualizamos el storage primero
    localStorage.setItem('userName', nombreLimpio);

    // Actualizamos el signal después para disparar la reactividad en la UI
    this.userName.set(nombreLimpio);

  }

}
