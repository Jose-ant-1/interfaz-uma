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

  // Control de edición de Password
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
    // Extraemos y limpiamos los datos (Trim)
    const nombreLimpio = this.datosEdit().nombre?.trim();
    const emailLimpio = this.datosEdit().email?.trim();

    // Expresión regular para validar el formato del email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,4}$/;

    // Validación: No permitir campos vacíos tras el trim
    if (!nombreLimpio || !emailLimpio) {
      alert('El nombre y el email son obligatorios y no pueden contener solo espacios.');
      return;
    }

    // Validación: Formato de email
    if (!emailRegex.test(emailLimpio)) {
      alert('Por favor, introduce un formato de correo electrónico válido.');
      return;
    }

    // Preparamos el objeto final con los datos ya limpios
    const datosParaEnviar: Partial<Usuario> = {
      ...this.datosEdit(),
      nombre: nombreLimpio,
      email: emailLimpio
    };

    // Si todo esta bien, procedemos a la actualización
    this.usuarioService.updatePerfil(datosParaEnviar).subscribe({
      next: (userActualizado) => {
        // Actualizamos sesión y estado local
        this.authService.actualizarDatosTrasCambio(userActualizado.email, userActualizado.nombre);
        this.usuario.set(userActualizado);
        this.editando.set(false);
      },
      error: (err) => {
        console.error("Error al actualizar:", err);
        alert('Error: El email podría estar ya en uso o el servidor rechazó los datos.');
      }
    });
  }

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

    // Usamos trim() para eliminar espacios accidentales (o malintencionados)
    const passLimpia = this.nuevaPassword().trim();

    if (!userActual) return;

    // Validamos sobre la versión LIMPIA
    if (passLimpia.length === 0) {
      alert('La contraseña no puede estar vacía ni contener solo espacios.');
      return;
    }

    if (passLimpia.length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres (sin contar espacios en los extremos).');
      return;
    }

    // Creamos el objeto para enviar
    const usuarioParaActualizar: Usuario = {
      ...userActual,
      contrasenia: passLimpia // Enviamos la versión ya limpia
    };

    this.usuarioService.updatePerfil(usuarioParaActualizar).subscribe({
      next: () => {
        alert('Contraseña actualizada con éxito. Inicia sesión de nuevo.');
        this.authService.logout();
        window.location.href = '/login';
      },
      error: (err) => {
        console.error("Error al actualizar pass", err);
        alert(err.error || 'Error al actualizar la contraseña');
      }
    });
  }
}
