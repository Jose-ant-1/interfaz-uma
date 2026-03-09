// auth.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  // Si usas el móvil, recuerda cambiar 'localhost' por tu IP (ej. 192.168.1.XX)
  private apiUrl = 'http://localhost:8080/api/usuarios';

  // Señales reactivas para el estado de la aplicación
  userRole = signal<string | null>(localStorage.getItem('userRole'));
  userName = signal<string | null>(localStorage.getItem('userName'));
  userId = signal<string | null>(localStorage.getItem('userId'));

// auth.ts corregido
  login(email: string, pass: string) {
    // Limpiamos espacios en blanco del email
    const cleanEmail = email.trim();

    // Generamos el Basic Auth asegurando que sea una cadena limpia
    const authHeader = 'Basic ' + btoa(unescape(encodeURIComponent(cleanEmail + ':' + pass)));

    // IMPORTANTE: Limpiamos el localStorage antes de poner el nuevo para evitar duplicados
    localStorage.clear();
    localStorage.setItem('authData', authHeader);

    return this.http.get(`${this.apiUrl}/me`).pipe(
      tap((user: any) => {
        // Guardamos datos con seguridad de nulos
        localStorage.setItem('userRole', user.permiso || 'USER');
        localStorage.setItem('userName', user.nombre || '');
        localStorage.setItem('userId', user.id ? user.id.toString() : '');

        this.userRole.set(user.permiso);
        this.userName.set(user.nombre);
        this.userId.set(user.id ? user.id.toString() : null);
      }),
      catchError(err => {
        localStorage.removeItem('authData');
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

    try {
      const base64 = authData.replace('Basic ', '');
      const decoded = decodeURIComponent(escape(atob(base64)));
      const password = decoded.substring(decoded.indexOf(':') + 1);

      // 1. El token SIEMPRE necesita el correo para el Basic Auth
      const nuevoAuthHeader = 'Basic ' + btoa(unescape(encodeURIComponent(nuevoEmail.trim() + ':' + password)));
      localStorage.setItem('authData', nuevoAuthHeader);

      // 2. Pero la Signal userName debe guardar el NOMBRE real
      localStorage.setItem('userName', nuevoNombre);
      this.userName.set(nuevoNombre); // Esto actualiza el Aside automáticamente

    } catch (e) {
      console.error("Error al actualizar credenciales", e);
    }
  }

  // Método de utilidad para comprobar si el usuario es Admin
  isAdmin(): boolean {
    return this.userRole() === 'ADMIN';
  }
}
