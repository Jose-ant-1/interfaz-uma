import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../models/usuario.model';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-usuario-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './usuario-card.html'
})
export class UsuarioCardComponent {
  @Input({ required: true }) usuario!: Usuario;
  @Output() onDelete = new EventEmitter<number>();

  eliminar() {
    this.onDelete.emit(this.usuario.id);
  }

}
