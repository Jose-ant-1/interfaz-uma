import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MonitoreoService } from '../../services/monitoreo.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';

@Component({
  selector: 'app-monitoreo-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './monitoreo-editar.html'
})
export class MonitoreoEditar implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private monitoreoService = inject(MonitoreoService);

  private usuarioService = inject(UsuarioService); // Inyectamos el servicio de usuarios
  usuariosSistema = signal<Usuario[]>([]); // Todos los usuarios para la lista

  cargando = signal(true);

  // Objeto para manejar los datos del formulario
  monitoreo: any = {
    id: 0,
    nombre: '',
    paginaUrl: '',
    minutosMonitoreo: 1,
    repeticiones: 3
  };

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    if (id) {
      this.monitoreoService.getMonitoreoPorId(Number(id)).subscribe({
        next: (data) => {
          this.monitoreo = data;
          this.cargando.set(false);
        },
        error: (err) => {
          console.error("Error cargando el monitoreo", err);
          this.router.navigate(['/dashboard/monitoreos']);
        }
      });
    }

    this.usuarioService.getUsuarios().subscribe({
      next: (users) => this.usuariosSistema.set(users),
      error: (err) => console.error("Error cargando usuarios", err)
    });
  }

  guardar() {
    const id = this.monitoreo.id;
    const payload = {
      nombre: this.monitoreo.nombre,
      url: this.monitoreo.paginaUrl, // Verifica que esto tenga valor
      minutos: Number(this.monitoreo.minutosMonitoreo), // Forzamos número
      repeticiones: Number(this.monitoreo.repeticiones)
    };

    this.monitoreoService.updateMonitoreo(id, payload).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/monitoreos']);
      },
      error: (err) => {
        console.error("Error al guardar", err);
        alert("Error: No se pudo guardar. Revisa los permisos o los datos.");
      }
    });
  }

  // Función para saber si un usuario ya es invitado
  esInvitado(usuarioId: number): boolean {
    if (!this.monitoreo.invitados) return false;
    // Comparamos numéricamente para evitar errores de tipos
    return this.monitoreo.invitados.some((i: any) => Number(i.id) === Number(usuarioId));
  }

  // Función que se dispara al hacer clic en el checkbox
  toggleInvitado(usuario: Usuario) {
    this.monitoreoService.invitarUsuario(this.monitoreo.id, usuario.email).subscribe({
      next: (res) => {
        console.log("Invitados que vienen del servidor:", res.invitados);
        // Forzamos la actualización de la referencia para que Angular detecte el cambio
        this.monitoreo = { ...res };
      }
    });
  }



}
