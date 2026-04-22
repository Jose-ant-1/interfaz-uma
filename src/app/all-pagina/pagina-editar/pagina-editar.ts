import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core'; // Añadido DestroyRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PaginaService } from '../../services/pagina.service';
import { Pagina } from '../../models/pagina.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Añadido este import

@Component({
  selector: 'app-pagina-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pagina-editar.html'
})
export class PaginaEditar implements OnInit {
  private readonly paginaService = inject(PaginaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef); // Correcto ahora

  pagina = signal<Pagina | null>(null);
  esEdicion = signal(false);
  cargando = signal(false); // Pilar: Estado de Carga

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam && !Number.isNaN(+idParam)) {
      this.esEdicion.set(true);
      this.paginaService.getPaginaById(+idParam)
        .pipe(takeUntilDestroyed(this.destroyRef)) // Protección de memoria
        .subscribe({
          next: (data) => this.pagina.set(data),
          error: () => void this.router.navigate(['/dashboard/paginas'])
        });
    } else {
      this.esEdicion.set(false);
      this.pagina.set({ nombre: '', url: '', notaInfo: '' } as Pagina);
    }
  }

  guardar(): void {
    const data = this.pagina();
    if (!data || this.cargando()) return; // Bloqueo de re-entrada

    this.cargando.set(true);

    const request$ = this.esEdicion()
      ? this.paginaService.updatePagina(data.id, data)
      : this.paginaService.createPagina(data);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          void this.router.navigate(['/dashboard/paginas']);
        },
        error: (err) => {
          this.cargando.set(false);
          console.error('Error al guardar:', err);
          alert('Error al procesar la solicitud');
        }
      });
  }
}
