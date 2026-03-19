import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import {RouterLink} from '@angular/router';
import {debounceTime, distinctUntilChanged, Subject, switchMap} from 'rxjs';
import {UsuarioCardComponent} from '../usuario-card/usuario-card';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, RouterLink, UsuarioCardComponent],
  templateUrl: './usuario-lista.html'
})
export class UsuariosListComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private buscador$ = new Subject<string>();

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    this.buscador$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.usuarioService.buscarUsuarios(term))
    ).subscribe(data => this.usuarios.set(data));

    this.cargarUsuarios();
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.buscador$.next(term);
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
