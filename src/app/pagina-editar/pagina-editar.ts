import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaginaService } from '../services/pagina.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Pagina } from '../models/pagina.model';

@Component({
  selector: 'app-pagina-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pagina-editar.html'
})

export class PaginaEditar implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paginaService = inject(PaginaService);

  cargando = signal(true);

  // USA EL MODELO AQUÍ:
  // Inicializamos con un objeto vacío que cumple con la interfaz Pagina
  // Usamos el casting 'as Pagina' para que TS nos deje empezar con valores por defecto
  pagina: Pagina = {
    id: 0,
    nombre: '',
    url: '',
    notaInfo: '' // Al ser opcional en el model (?), esto es válido
  };

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    this.paginaService.getPaginaById(id).subscribe({
      next: (data: Pagina) => { // Especificamos que lo que recibimos es una Pagina
        this.pagina = data;
        this.cargando.set(false);
      },
      error: (err) => {
        console.error("Error cargando la página", err);
        this.router.navigate(['/dashboard/paginas']);
      }
    });
  }

  guardar() {
    // Como 'this.pagina' ya es de tipo Pagina,
    // el servicio lo aceptará sin quejarse.
    this.paginaService.updatePagina(this.pagina.id, this.pagina).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/pagina', this.pagina.id]);
      },
      error: (err) => console.error("Error al actualizar", err)
    });
  }
}
