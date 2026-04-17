import {Component, OnInit, inject, signal, DestroyRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-usuario-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-editar.html'
})
export class UsuarioEditar implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef); // Inyectamos la referencia de destrucción

  usuario = signal<Usuario | null>(null);
  cargando = signal(true);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    // PILAR: Caso de Borde (Evitamos que se procese un ID nulo o inválido)
    if (!idParam || Number.isNaN(id)) {
      this.router.navigate(['/dashboard/usuarios']);
      return;
    }

    this.cargarUsuario(id);
  }

  private cargarUsuario(id: number): void {
    this.usuarioService.getUsuarioById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: Usuario) => { // <--- Asegúrate de poner ": Usuario" aquí
          this.usuario.set({ ...data, contrasenia: '' });
          this.cargando.set(false);
        },
        error: () => void this.router.navigate(['/dashboard/usuarios'])
      });
  }

  guardar(): void {
    const currentUsuario = this.usuario();

    // 1. Caso de borde: No hay usuario
    if (!currentUsuario?.id) return;

    // 2. PILAR BLOQUEO: Si ya está cargando, ignoramos el clic
    if (this.cargando()) return;

    this.cargando.set(true);

    this.usuarioService.updateUsuario(currentUsuario.id, currentUsuario)
      .pipe(takeUntilDestroyed(this.destroyRef)) // 3. PILAR MEMORIA
      .subscribe({
        next: () => {
          // 4. PILAR INTEGRIDAD: Navegación solo en éxito
          void this.router.navigate(['/dashboard/usuarios']);
        },
        error: (err) => {
          // 5. PILAR ROBUSTEZ: Liberar bloqueo en error
          this.cargando.set(false);
          console.error(err);
          alert('Error al actualizar. Revisa que no se repita el nombre o el correo.');
        }
      });
  }

}
