import {Component, OnInit, inject, signal, DestroyRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import {catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap} from 'rxjs';
import {UsuarioCardComponent} from '../usuario-card/usuario-card';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, UsuarioCardComponent],
  templateUrl: './usuario-lista.html'
})
export class UsuariosListComponent implements OnInit {

  private readonly usuarioService = inject(UsuarioService);
  private readonly buscador$ = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef); // Inyectado en el constructor (implícito)

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  eliminandoId = signal<number | null>(null);

  ngOnInit(): void {
    this.buscador$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.usuarioService.buscarUsuarios(term).pipe(
        catchError(() => of([]))
      )),
      takeUntilDestroyed(this.destroyRef) // <--- Asegúrate de pasar this.destroyRef
    ).subscribe(data => this.usuarios.set(data));

    this.cargarUsuarios();
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.buscador$.next(term);
  }

  cargarUsuarios() {
    this.cargando.set(true); // Aseguramos el estado inicial de carga
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
    // 1. BLOQUEO: Si ya hay algo procesándose, abortamos
    if (this.eliminandoId() !== null) return;

    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      // 2. ACTIVAMOS EL SEMÁFORO: Marcamos qué ID estamos borrando
      this.eliminandoId.set(id);

      this.usuarioService.eliminarUsuario(id).subscribe({
        next: () => {
          this.usuarios.update(prev => prev.filter(u => u.id !== id));
          console.log(`Usuario ${id} eliminado correctamente`);
          // 3. LIBERAMOS: Éxito
          this.eliminandoId.set(null);
        },
        error: (err: any) => {
          console.error("Error al eliminar usuario", err);
          alert('Hubo un error al intentar eliminar al usuario.');
          // 3. LIBERAMOS: Error (Resiliencia para permitir reintentar)
          this.eliminandoId.set(null);
        }
      });
    }
  }

}
