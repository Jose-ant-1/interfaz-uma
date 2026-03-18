import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PaginaService } from '../../services/pagina.service';
import { Pagina } from '../../models/pagina.model';

@Component({
  selector: 'app-pagina-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pagina-editar.html'
})
export class PaginaEditar implements OnInit {
  private paginaService = inject(PaginaService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signal para manejar los datos del formulario
  pagina = signal<Pagina>({
    id: 0,
    nombre: '',
    url: '',
    notaInfo: ''
  });

  esEdicion = signal(false);

  ngOnInit(): void {
    // Capturamos el ID de la ruta
    const id = this.route.snapshot.params['id'];

    if (id) {
      this.esEdicion.set(true);
      // 2. Cargamos los datos actuales de la página desde el backend
      this.paginaService.getPaginaById(+id).subscribe({
        next: (data) => this.pagina.set(data),
        error: () => this.router.navigate(['/dashboard/paginas'])
      });
    }
  }

  guardar(): void {
    if (this.esEdicion()) {
      // Si es edición, usamos el updatePagina
      this.paginaService.updatePagina(this.pagina().id, this.pagina()).subscribe({
        next: () => this.router.navigate(['/dashboard/paginas']),
        error: (err) => alert('Error al actualizar la página')
      });
    } else {
      // Si es creación, usamos createPagina
      this.paginaService.createPagina(this.pagina()).subscribe({
        next: () => this.router.navigate(['/dashboard/paginas']),
        error: (err) => alert('Error al crear la página')
      });
    }
  }
}
