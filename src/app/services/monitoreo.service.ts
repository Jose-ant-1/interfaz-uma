// En monitoreo.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MonitoreoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/monitoreos';

  // Helper para obtener los headers (puedes mover esto a un Interceptor después)
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authData');
    return new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
  }

  obtenerTodosLosMonitoreos(): Observable<any[]> {
    const token = localStorage.getItem('authData');
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });
    // Endpoint específico para administradores
    return this.http.get<any[]>(`${this.apiUrl}/all`, { headers });
  }

  getMisMonitoreos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // NUEVO: Para obtener las páginas donde eres invitado
  getColaboraciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/colaboraciones`, { headers: this.getHeaders() });
  }

  // NUEVO: Para obtener el perfil del usuario (puedes crear un usuario.service aparte si prefieres)
  getPerfil(): Observable<any> {
    return this.http.get<any>('http://localhost:8080/api/usuarios/me', { headers: this.getHeaders() });
  }
}
