import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monitoreo-detalles',
  templateUrl: './monitoreo-detalle.html',
  imports: [RouterLink, CommonModule],
  standalone: true
})
export class PaginaDetalles implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  monitoreo = signal<any>(null);
  notaInformativa = signal<string>('Cargando nota...');
  isAdmin = signal<boolean>(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const token = localStorage.getItem('authData');
    const role = localStorage.getItem('userRole');

    this.isAdmin.set(role?.toUpperCase() === 'ADMIN');

    if (id && token) {
      const headers = new HttpHeaders({
        'Authorization': token.startsWith('Basic ') ? token : `Basic ${token}`
      });

      // 1. Cargar datos del MonitoreoDTO
      this.http.get<any>(`http://localhost:8080/api/monitoreos/${id}`, { headers }).subscribe({
        next: (data) => {
          this.monitoreo.set(data);

          // 2. Obtener la Nota Informativa (Llamada al endpoint de página del monitoreo)
          this.http.get<any>(`http://localhost:8080/api/monitoreos/${id}/pagina`, { headers }).subscribe({
            next: (pagina) => this.notaInformativa.set(pagina.notaInfo || 'Sin nota disponible.'),
            error: () => this.notaInformativa.set('No se pudo cargar la nota informativa.')
          });

          // 3. Check de estado inmediato
          this.http.post<any>(`http://localhost:8080/api/monitoreos/${id}/check`, {}, { headers }).subscribe({
            next: (actualizado) => this.monitoreo.set(actualizado)
          });
        }
      });
    }
  }

  eliminarMonitoreo() {
    const id = this.monitoreo()?.id;
    const token = localStorage.getItem('authData');
    if (id && token && confirm('¿Eliminar este monitoreo permanentemente?')) {
      const headers = new HttpHeaders({ 'Authorization': token.startsWith('Basic ') ? token : `Basic ${token}` });
      this.http.delete(`http://localhost:8080/api/monitoreos/${id}`, { headers }).subscribe({
        next: () => window.location.href = '/dashboard/monitoreos'
      });
    }
  }
}
