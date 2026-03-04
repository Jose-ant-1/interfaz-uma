import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {catchError, tap} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/usuarios';

  // Estas señales son las que leerán el Layout y el Dashboard
  userRole = signal<string | null>(localStorage.getItem('userRole'));
  userName = signal<string | null>(localStorage.getItem('userName'));

  login(email: string, pass: string) {
    const authHeader = 'Basic ' + btoa(email + ':' + pass);

    // 1. Guardamos ANTES de la llamada para que el interceptor lo pesque
    localStorage.setItem('authData', authHeader);

    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((user: any) => {
        // Si tiene éxito, guardamos el resto
        localStorage.setItem('userRole', user.permiso);
        localStorage.setItem('userName', user.nombre);
        this.userRole.set(user.permiso);
        this.userName.set(user.nombre);
      }),
      catchError(err => {
        // Si falla, borramos el token temporal para no dejar basura
        localStorage.removeItem('authData');
        throw err;
      })
    );
  }

  logout() {
    localStorage.removeItem('authData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');

    // Reseteamos las señales para que el Layout se actualice al instante
    this.userRole.set(null);
    this.userName.set(null);
  }
}
