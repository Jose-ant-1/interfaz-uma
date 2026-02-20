import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {PaginaLista} from '../componentes-detalles-pagina/pagina-lista/pagina-lista';
import {AuthService} from '../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PaginaLista],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private authService = inject(AuthService);

  // Conectamos directamente a las señales del servicio
  userRole = this.authService.userRole;
  username = this.authService.userName; // Cambiado de 'username' a 'userName' para coincidir
}
