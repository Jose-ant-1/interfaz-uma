import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {UsuarioService} from '../../services/usuario.service';
import {Usuario} from '../../models/usuario.model';

@Component({
  selector: 'app-usuario-anyadir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-anyadir.html'
})
export class UsuarioAnyadir {
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);

  // Nuevo signal para controlar el estado de carga
  cargando = signal<boolean>(false);

  nuevoUsuario = signal<Partial<Usuario>>({
    nombre: '',
    email: '',
    contrasenia: '',
    permiso: 'USER'
  });

// Fragmento a mejorar en el método guardar() de usuario-editar.ts
  guardar(): void {
    const currentUsuario = this.usuario();
    if (!currentUsuario?.id || this.cargando()) return; // Bloqueo de re-entrada

    this.cargando.set(true);

    // Pilar de Sanitización
    const usuarioSanitizado = {
      ...currentUsuario,
      nombre: currentUsuario.nombre.trim(),
      email: currentUsuario.email.trim()
    };

    this.usuarioService.updateUsuario(currentUsuario.id, usuarioSanitizado).subscribe({
      next: () => void this.router.navigate(['/dashboard/usuarios']),
      error: (err) => {
        this.cargando.set(false);
        console.error(err);
        alert('Error al actualizar. Revisa que no se repita el nombre o el correo.');
      }
    });
  }
}
