import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {PaginaService} from '../../services/pagina.service';
import {Pagina} from '../../models/pagina.model';
import {Subject, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {PaginaCardComponent} from '../pagina-card/pagina-card';

@Component({
  selector: 'app-pagina-list',
  standalone: true,
  imports: [CommonModule, PaginaCardComponent],
  templateUrl: './pagina-lista.html'
})
export class PaginaListComponent implements OnInit {
  private paginaService = inject(PaginaService);
  private buscador$ = new Subject<string>(); // Flujo de términos de búsqueda
  // Signal para manejar los datos reactivamente
  paginas = signal<Pagina[]>([]);

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.buscador$.next(input.value);
  }

  ngOnInit(): void {
  // Configuramos el buscador reactivo
    this.buscador$.pipe(
      distinctUntilChanged(), // Solo busca si el término cambió
      switchMap(term => term.length > 0
        ? this.paginaService.buscarPaginas(term)
        : this.paginaService.getPaginas()
      )
    ).subscribe({
      next: (data) => this.paginas.set(data),
      error: (err) => console.error('Error en búsqueda:', err)
    });

    this.obtenerPaginas();
  }

  obtenerPaginas(): void {
    this.paginaService.getPaginas().subscribe({
      next: (data) => this.paginas.set(data),
      error: (err) => console.error('Error cargando páginas:', err)
    });
  }

  eliminar(id: number): void {
    if (confirm('¿Deseas eliminar esta página del catálogo general?')) {
      this.paginaService.deletePagina(id).subscribe({
        next: () => {
          this.paginas.update(actuales => actuales.filter(p => p.id !== id));
        },
        error: (err) => alert('Error: No se puede eliminar una página vinculada a monitoreos activos.')
      });
    }
  }

}
