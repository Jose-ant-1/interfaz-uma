import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PaginaService } from '../../services/pagina.service';
import { Pagina } from '../../models/pagina.model';

@Component({
  selector: 'app-pagina-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pagina-anyadir.html'
})
export class PaginaAnyadir {
  private paginaService = inject(PaginaService);
  private router = inject(Router);

  // Inicializamos la signal con un objeto vacío siguiendo la interfaz Pagina
  // El ID se omite ya que lo genera el backend al crear
  nuevaPagina = signal<Partial<Pagina>>({
    nombre: '',
    url: '',
    notaInfo: ''
  });

  guardar(): void {
    this.paginaService.createPagina(this.nuevaPagina() as Pagina).subscribe({
      next: () => {
        // Redirigir al catálogo tras la creación exitosa
        this.router.navigate(['/dashboard/paginas']);
      },
      error: (err) => {
        console.error('Error al crear la página:', err);
        alert('Hubo un error al guardar la página. Verifique los datos.');
      }
    });
  }
}
