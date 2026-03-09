import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaginaService } from '../../services/pagina.service';
import { Pagina } from '../../models/pagina.model';

@Component({
  selector: 'app-pagina-list',
  standalone: true,
  imports: [CommonModule, RouterLink], // CommonModule es necesario para pipes y otros si no usas 100% nueva sintaxis
  templateUrl: './pagina-lista.html'
})
export class PaginaListComponent implements OnInit {
  private paginaService = inject(PaginaService);

  // Signal para manejar los datos reactivamente
  paginas = signal<Pagina[]>([]);

  ngOnInit(): void {
    this.obtenerPaginas();
  }

  obtenerPaginas(): void {
    this.paginaService.getPaginas().subscribe({
      next: (data) => this.paginas.set(data),
      error: (err) => console.error('Error cargando páginas:', err)
    });
  }

  eliminar(id: number): void {
    // Implementación de confirmación estética (puedes usar un modal luego)
    if (confirm('¿Deseas eliminar esta página del catálogo general?')) {
      this.paginaService.deletePagina(id).subscribe({
        next: () => {
          this.paginas.update(actuales => actuales.filter(p => p.id !== id));
        },
        error: (err) => alert('Error: No se puede eliminar una página vinculada a monitoreos activos.')
      });
    }
  }

  formatearUrl(url: string): string {
    if (!url) return '';
    // Si la url no empieza con http o https, se lo añadimos para que el navegador sepa que es externa
    return url.startsWith('http') ? url : `https://${url}`;
  }
}
