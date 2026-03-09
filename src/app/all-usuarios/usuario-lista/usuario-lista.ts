import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuario-lista.html'
})
export class UsuariosListComponent implements OnInit {
  private usuarioService = inject(UsuarioService);

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usuarioService.getUsuarios().subscribe({
      next: (data: Usuario[]) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: (err: any) => {
        console.error("Error al cargar usuarios", err);
        this.cargando.set(false);
      }
    });
  }

  // Nuevo método para eliminar
  eliminarUsuario(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      this.usuarioService.eliminarUsuario(id).subscribe({
        next: () => {
          // Filtramos la lista local para eliminar al usuario visualmente sin recargar toda la página
          this.usuarios.update(prev => prev.filter(u => u.id !== id));
          console.log(`Usuario ${id} eliminado correctamente`);
        },
        error: (err: any) => {
          console.error("Error al eliminar usuario", err);
          alert('Hubo un error al intentar eliminar al usuario.');
        }
      });
    }
  }
}
