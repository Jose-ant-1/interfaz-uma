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

  guardar(): void {
    if (this.cargando()) return; // Pilar: Bloqueo

    const datos = this.nuevoUsuario();
    const datosLimpios = { // Pilar: Sanitización
      ...datos,
      nombre: datos.nombre?.trim(),
      email: datos.email?.trim()
    };

    this.cargando.set(true);
    this.usuarioService.crearUsuario(datosLimpios).subscribe({
      next: () => void this.router.navigate(['/dashboard/usuarios']),
      error: (err) => {
        this.cargando.set(false); // Pilar: Manejo de Errores
        alert('Error al guardar');
      }
    });
  }

}
