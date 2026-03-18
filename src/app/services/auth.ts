// auth.ts
import { inject, Injectable, signal } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { catchError, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/usuarios';

  // Señales reactivas para el estado de la aplicación
  userRole = signal<string | null>(localStorage.getItem('userRole'));
  userName = signal<string | null>(localStorage.getItem('userName'));
  userId = signal<string | null>(localStorage.getItem('userId'));

  login(email: string, pass: string) {
    const cleanEmail = email.trim();

    const credentials = `${cleanEmail}:${pass}`;
    const encoded = btoa(Array.from(new TextEncoder().encode(credentials))
      .map(b => String.fromCharCode(b)).join(''));

    const authHeader = `Basic ${encoded}`;

    // IMPORTANTE: Para la primera petición (/me), debemos pasar el header manualmente
    const headers = new HttpHeaders({ 'Authorization': authHeader });

    return this.http.get(`${this.apiUrl}/me`, { headers }).pipe(
      tap((user: any) => {
        // Si llegamos aquí, las credenciales son válidas
        localStorage.clear();
        localStorage.setItem('authData', authHeader);
        localStorage.setItem('userRole', user.permiso || 'USER');
        localStorage.setItem('userName', user.nombre || '');
        localStorage.setItem('userId', user.id?.toString() || '');

        this.userRole.set(user.permiso);
        this.userName.set(user.nombre);
        this.userId.set(user.id?.toString() || null);
      }),
      catchError(err => {
        localStorage.removeItem('authData');
        console.error('Error en login:', err);
        throw err;
      })
    );
  }

  logout() {
    // Limpieza total del rastro de sesión
    localStorage.removeItem('authData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');

    // Reset de señales
    this.userRole.set(null);
    this.userName.set(null);
    this.userId.set(null);
  }

  actualizarCredencialesTrasCambioEmail(nuevoEmail: string, nuevoNombre: string) {
    const authData = localStorage.getItem('authData');
    if (!authData) return;

    // Decodificar de forma segura
    const base64 = authData.replace('Basic ', '');
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
    const password = decoded.split(':')[1];

    // Re-encodear
    const nuevasCreds = `${nuevoEmail.trim()}:${password}`;
    const nuevoAuth = 'Basic ' + btoa(Array.from(new TextEncoder().encode(nuevasCreds)).map(b => String.fromCharCode(b)).join(''));

    localStorage.setItem('authData', nuevoAuth);
    this.userName.set(nuevoNombre);
  }

}
