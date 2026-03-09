import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoreoService } from '../services/monitoreo.service';
import { UsuarioService } from '../services/usuario.service';
import { Usuario } from '../models/usuario.model';
import { MonitoreoListadoDTO } from '../models/monitoreo.model';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html'
})
export class PerfilComponent implements OnInit {
  private monitoreoService = inject(MonitoreoService);
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);

  usuario = signal<Usuario | null>(null);
  monitoreosPropios = signal<MonitoreoListadoDTO[]>([]);
  monitoreosInvitado = signal<MonitoreoListadoDTO[]>([]);

  // Control de edición de Info (Nombre/Email)
  editando = signal(false);
  datosEdit = signal<Partial<Usuario>>({ nombre: '', email: '' });

  // NUEVO: Control de edición de Password
  editandoPassword = signal(false);
  nuevaPassword = signal(''); // Empezará siempre vacío por seguridad

  propiosCount = computed(() => this.monitoreosPropios().length);
  invitadoCount = computed(() => this.monitoreosInvitado().length);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.usuarioService.getPerfil().subscribe({
      next: (user) => this.usuario.set(user),
      error: (err) => console.error("Error al obtener perfil", err)
    });

    this.monitoreoService.getMisMonitoreos().subscribe({
      next: (data) => this.monitoreosPropios.set(data)
    });

    this.monitoreoService.getColaboraciones().subscribe({
      next: (data) => this.monitoreosInvitado.set(data)
    });
  }

  // --- LÓGICA PERFIL ---
  activarEdicion() {
    const userActual = this.usuario();
    if (userActual) {
      this.datosEdit.set({ nombre: userActual.nombre, email: userActual.email });
      this.editandoPassword.set(false); // Cerramos la otra edición si estuviera abierta
      this.editando.set(true);
    }
  }

  cancelarEdicion() {
    this.editando.set(false);
  }

  guardarCambios() {
    this.usuarioService.updatePerfil(this.datosEdit()).subscribe({
      next: (userActualizado) => {
        this.authService.actualizarCredencialesTrasCambioEmail(userActualizado.email, userActualizado.nombre);
        this.usuario.set(userActualizado);
        this.editando.set(false);
      },
      error: () => alert('Error al actualizar el perfil')
    });
  }

  // --- LÓGICA PASSWORD ---
  activarEdicionPassword() {
    this.nuevaPassword.set(''); // Siempre vacía al empezar
    this.editando.set(false);   // Cerramos la otra edición
    this.editandoPassword.set(true);
  }

  cancelarEdicionPassword() {
    this.editandoPassword.set(false);
  }

  guardarPassword() {
    const userActual = this.usuario();

    if (!userActual) return;

    if (this.nuevaPassword().length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    // Creamos el objeto completo para el backend
    const usuarioParaActualizar: Usuario = {
      ...userActual,             // Copiamos todo lo que ya tiene (id, nombre, email, permiso...)
      contrasenia: this.nuevaPassword() // Añadimos la nueva contraseña
    };

    this.usuarioService.updatePerfil(usuarioParaActualizar).subscribe({
      next: () => {
        alert('Contraseña actualizada con éxito. Por seguridad, inicia sesión de nuevo.');
        this.authService.logout();
        window.location.href = '/login';
      },
      error: (err: any) => {
        console.error("Error al actualizar pass", err);
        alert('No se pudo actualizar la contraseña. Revisa la consola.');
      }
    });
  }
}
