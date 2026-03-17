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
// IMPORTANTE: Asegúrate de que el nombre sea UsuarioEditarComponent
export class UsuarioEditar implements OnInit {
  private usuarioService = inject(UsuarioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  usuarioOriginal: Usuario | null = null;
  usuarioEdit = signal<Partial<Usuario>>({});
  cargando = signal(true);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.usuarioService.getUsuarioById(id).subscribe({
        next: (data) => {
          this.usuarioOriginal = data;
          this.usuarioEdit.set({ ...data, contrasenia: '' });
          this.cargando.set(false);
        },
        error: () => this.router.navigate(['/dashboard/usuarios'])
      });
    }
  }

  guardar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // Enviamos solo lo que tenemos en el formulario
    const datos = {
      nombre: this.usuarioEdit().nombre,
      email: this.usuarioEdit().email,
      permiso: this.usuarioEdit().permiso,
      contrasenia: this.usuarioEdit().contrasenia // Puede ir vacío
    };

    this.usuarioService.updateUsuario(id, datos).subscribe({
      next: () => this.router.navigate(['/dashboard/usuarios']),
      error: (err) => alert('Error al actualizar. Revisa que no se repita el nombre o el correo.')
    });
  }





}
