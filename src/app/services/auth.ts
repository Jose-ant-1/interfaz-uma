import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/usuarios';

  // Estas señales son las que leerán el Layout y el Dashboard
  userRole = signal<string | null>(localStorage.getItem('userRole'));
  userName = signal<string | null>(localStorage.getItem('userName'));

  login(email: string, pass: string) {
    const authHeader = 'Basic ' + btoa(email + ':' + pass);

    return this.http.get(`${this.apiUrl}/me`, {
      headers: new HttpHeaders({ 'Authorization': authHeader })
    }).pipe(
      tap((user: any) => {
        // Guardamos credenciales y actualizamos señales
        localStorage.setItem('authData', authHeader);
        localStorage.setItem('userRole', user.permiso); // 'ADMIN' o 'USER'
        localStorage.setItem('userName', user.nombre);

        this.userRole.set(user.permiso);
        this.userName.set(user.nombre);
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
