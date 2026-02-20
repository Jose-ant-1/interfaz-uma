import {Component, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {PaginaLista} from '../componentes-detalles-pagina/pagina-lista/pagina-lista';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PaginaLista],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  userRole = signal<'ADMIN' | 'USER'>('ADMIN');

  username = signal('Arturo')
}
