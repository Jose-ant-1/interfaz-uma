import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagina-detalles',
  templateUrl: './pagina-detalle.html',
  imports: [RouterLink, CommonModule],
  standalone: true
})
export class PaginaDetalles implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  pagina = signal<any>(null);
  usuariosConAcceso = signal<any[]>([]);
  isAdmin = signal<boolean>(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const token = localStorage.getItem('authData'); // Tu clave correcta
    const role = localStorage.getItem('userRole') || localStorage.getItem('role');

    this.isAdmin.set(role?.toUpperCase() === 'ADMIN');

    if (id && token) {
      const headers = new HttpHeaders({
        'Authorization': token.startsWith('Basic ') ? token : `Basic ${token}`
      });

      // 1. Cargamos el detalle
      this.http.get<any>(`http://localhost:8080/api/paginas/${id}`, { headers }).subscribe({
        next: (data) => {
          // Inicializamos el estado en 0 (Cargando)
          data.estadoCode = 0;
          this.pagina.set(data);

          // 2. Comprobamos el estado real (ONLINE/OFFLINE)
          this.http.get<number>(`http://localhost:8080/api/paginas/${id}/check-status`, { headers }).subscribe({
            next: (code) => {
              // Actualizamos la señal con el código recibido (200, 404...)
              this.pagina.update(current => ({ ...current, estadoCode: code }));
            },
            error: () => this.pagina.update(current => ({ ...current, estadoCode: 500 }))
          });

          // 3. Si es ADMIN, cargamos usuarios
          if (this.isAdmin()) {
            this.http.get<any[]>(`http://localhost:8080/api/paginas/${id}/usuarios`, { headers }).subscribe({
              next: (users) => this.usuariosConAcceso.set(users)
            });
          }
        }
      });
    }
  }
}
