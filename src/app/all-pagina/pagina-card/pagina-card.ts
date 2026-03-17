import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pagina } from '../../models/pagina.model';

@Component({
  selector: 'app-pagina-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pagina-card.html'
})
export class PaginaCardComponent {
  @Input({ required: true }) pagina!: Pagina;
  @Output() onDelete = new EventEmitter<number>();

  eliminar() {
    this.onDelete.emit(this.pagina.id);
  }

  // 1. SOLO PARA MOSTRAR: Quita el https:// para que no ocupe espacio visual
  formatearUrlVisual(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  // 2. SOLO PARA EL ENLACE: Asegura que tenga el protocolo para salir de la app
  prepararEnlace(url: string): string {
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  }
}
