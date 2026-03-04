import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MonitoreoService {
  private http = inject(HttpClient);
  // URL base de tu controlador de monitoreos
  private apiUrl = 'http://localhost:8080/api/monitoreos';

  /**
   * Obtiene la lista de monitoreos del usuario autenticado.
   * El backend filtra automáticamente por el ID del usuario en sesión.
   */
  getMisMonitoreos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  /**
   * Crea un nuevo monitoreo.
   * @param data Objeto con { url, nombrePagina, minutos }
   */
  crearMonitoreo(data: { url: string; nombrePagina: string; minutos: number }): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  /**
   * Obtiene el detalle de un monitoreo específico por ID.
   */
  getMonitoreoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza la configuración (nombre o minutos) de un monitoreo.
   */
  updateMonitoreo(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Elimina un monitoreo.
   */
  deleteMonitoreo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Fuerza un chequeo manual del estado de la web (Ping).
   * Este es el que usaremos en el botón de "Check Now" del detalle.
   */
  checkNow(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/check`, {});
  }
}
