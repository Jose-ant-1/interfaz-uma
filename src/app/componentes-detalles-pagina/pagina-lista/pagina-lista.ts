import { Component, inject, signal, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth';
import { PaginaService } from '../../services/pagina.service'; // Asegúrate de inyectarlo
import { PaginaCard } from '../pagina-card/pagina-card';

@Component({
  selector: 'app-pagina-lista',
  standalone: true,
  imports: [PaginaCard],
  templateUrl: './pagina-lista.html',
})

// pagina-lista.ts
export class PaginaLista {
  private authService = inject(AuthService);

  // Conectamos la señal
  userRole = this.authService.userRole;
  paginas = signal<any[]>([]);
}
