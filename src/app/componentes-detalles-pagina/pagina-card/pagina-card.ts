import {Component, inject, Input, OnInit, signal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pagina-card',
  standalone: true,
  templateUrl: './pagina-card.html',
})

export class PaginaCard implements OnInit {
  @Input() pagina!: any;
  @Input() isAdmin = false;
  private router = inject(Router);

  // Estado real detectado por el frontend
  estadoReal = signal<'CHECKING' | 'ONLINE' | 'LENTA' | 'OFFLINE'>('CHECKING');

  private http = inject(HttpClient);

  ngOnInit() {
    this.verificarEstado();
  }

  verDetalles() {
    this.router.navigate(['/dashboard/pagina', this.pagina.id]);
  }

  verificarEstado() {
    this.http.get<number>(`http://localhost:8080/api/paginas/${this.pagina.id}/check-status`)
      .subscribe({
        next: (code: number) => {
          console.log(`Código recibido para ${this.pagina.nombre}:`, code);

          // Lógica de colores basada en el número
          if (code >= 200 && code < 300) {
            this.estadoReal.set('ONLINE');
          } else if (code === 404 || code === 500) {
            this.estadoReal.set('OFFLINE');
          } else {
            // Por ejemplo, para el 403 que mencionaste antes
            this.estadoReal.set('ONLINE');
          }
        },
        error: (err) => {
          // Esto solo saltará si tu API de Java está caída
          console.error("Error conectando con la API de Java", err);
          this.estadoReal.set('OFFLINE');
        }
      });
  }
}
