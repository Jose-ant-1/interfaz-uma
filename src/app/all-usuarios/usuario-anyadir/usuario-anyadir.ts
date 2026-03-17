import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';

@Component({
  selector: 'app-usuario-anyadir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-anyadir.html'
})
export class UsuarioAnyadir {
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);

  // Inicializamos con valores por defecto
  nuevoUsuario = signal<Partial<Usuario>>({
    nombre: '',
    email: '',
    contrasenia: '',
    permiso: 'USER' // Rol por defecto
  });

  guardar(): void {
    this.usuarioService.crearUsuario(this.nuevoUsuario()).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (err) => {
        console.error('Error al crear usuario:', err);
        alert('Error al guardar el usuario. Revisa que el email o nombre no esté duplicado.');
      }
    });
  }
}
