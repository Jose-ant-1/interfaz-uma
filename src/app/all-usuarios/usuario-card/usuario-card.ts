import {Component, Output, EventEmitter, input} from '@angular/core';
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
  usuario = input.required<Usuario>();
  @Output() Delete = new EventEmitter<number>();

  eliminar() {
    this.Delete.emit(this.usuario().id);
  }

}
