import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Guardamos el usuario actual en una señal para que el HTML se entere
  currentUser = signal<any>(null);

  login(email: string, pass: string) {
    // Creamos la cabecera Basic Auth
    const authHeader = 'Basic ' + btoa(email + ':' + pass);

    // Llamamos a /me para validar quién es
    return this.http.get('http://localhost:8080/api/usuarios/me', {
      headers: new HttpHeaders({ 'Authorization': authHeader })
    }).pipe(
      tap((user: any) => {
        // SI LA API RESPONDE OK: Guardamos todo
        localStorage.setItem('authData', authHeader);
        localStorage.setItem('userRole', user.permiso); // "ADMIN" o "USER"
        localStorage.setItem('userName', user.nombre);
        this.currentUser.set(user);
      })
    );
  }

  logout() {
    localStorage.clear();
    this.currentUser.set(null);
  }
}
