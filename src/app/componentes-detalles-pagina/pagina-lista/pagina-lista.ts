import { Component, inject, signal, OnInit } from '@angular/core';
import { PaginaService } from '../../services/pagina.service';
import { AuthService } from '../../services/auth';
import { PaginaCard } from '../pagina-card/pagina-card';

@Component({
  selector: 'app-pagina-lista',
  standalone: true,
  imports: [PaginaCard],
  templateUrl: './pagina-lista.html',
})
export class PaginaLista implements OnInit {
  private paginaService = inject(PaginaService);
  private authService = inject(AuthService);

  paginas = signal<any[]>([]);
  userRole = this.authService.userRole;

  ngOnInit() {
    this.cargarPaginas();
  }

  cargarPaginas() {
    this.paginaService.getPaginas().subscribe({
      next: (data) => {
        this.paginas.set(data); // Asegúrate de que es .set() y no un push
      },
      error: (err) => console.error(err)
    });
  }
}
