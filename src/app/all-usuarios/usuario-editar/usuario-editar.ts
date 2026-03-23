import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';

@Component({
  selector: 'app-usuario-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-editar.html'
})
export class UsuarioEditar implements OnInit {
  private usuarioService = inject(UsuarioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Usamos null como estado inicial para que el @if del HTML funcione correctamente
  usuario = signal<Usuario | null>(null);
  cargando = signal(true);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.usuarioService.getUsuarioById(id).subscribe({
        next: (data) => {
          // Inicializamos la contraseña vacía para el formulario
          this.usuario.set({ ...data, contrasenia: '' });
          this.cargando.set(false);
        },
        error: () => this.router.navigate(['/dashboard/usuarios'])
      });
    }
  }

  guardar(): void {
    const currentUsuario = this.usuario();
    if (!currentUsuario || !currentUsuario.id) return;

    this.cargando.set(true); // Reutilizamos el estado de carga para el feedback del botón

    // Enviamos el objeto directamente, ya que 'usuario()' tiene la estructura correcta
    this.usuarioService.updateUsuario(currentUsuario.id, currentUsuario).subscribe({
      next: () => this.router.navigate(['/dashboard/usuarios']),
      error: (err) => {
        this.cargando.set(false);
        alert('Error al actualizar. Revisa que no se repita el nombre o el correo.');
      }
    });
  }
}
