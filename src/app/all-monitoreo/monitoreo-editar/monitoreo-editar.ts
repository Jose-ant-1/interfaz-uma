import {Component, OnInit, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {UsuarioService} from '../../services/usuario.service';
import {Usuario} from '../../models/usuario.model';
import {MonitoreoDTODetalle} from '../../models/monitoreo.model';
import {MonitoreoService} from '../../services/monitoreo.service';

@Component({
  selector: 'app-monitoreo-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './monitoreo-editar.html'
})
export class MonitoreoEditar implements OnInit {
  private usuarioService = inject(UsuarioService);
  private monitoreoService = inject(MonitoreoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  usuarioLogueadoId = signal<number | null>(null);
  usuariosSistema = signal<Usuario[]>([]);
  cargando = signal(true);
  guardando = signal(false); // Para bloquear el botón mientras guarda

  monitoreo: Partial<MonitoreoDTODetalle> = {
    nombre: '',
    minutos: 1,
    repeticiones: 3,
    invitados: []
  };

  invitadosOriginales: string[] = [];

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    this.usuarioService.getPerfil().subscribe({
      next: (yo) => {
        this.usuarioLogueadoId.set(yo.id!);
        this.cargarUsuariosSistema();
      }
    });

    if (id) {
      this.monitoreoService.getMonitoreoPorId(Number(id)).subscribe({
        next: (data) => {
          this.monitoreo = data;
          // Guardamos los emails con los que empieza el monitoreo
          this.invitadosOriginales = data.invitados?.map(i => i.email) || [];
          this.cargando.set(false);
        },
        error: () => this.router.navigate(['/dashboard/monitoreos'])
      });
    }
  }

  cargarUsuariosSistema() {
    this.usuarioService.getUsuarios().subscribe({
      next: (users) => {
        const filtrados = users.filter(u => u.id !== this.usuarioLogueadoId());
        this.usuariosSistema.set(filtrados);
      },
      error: (err) => console.error("Error cargando usuarios", err)
    });
  }

  esInvitado(usuarioId: number): boolean {
    if (!this.monitoreo.invitados) return false;
    return this.monitoreo.invitados.some((i: any) => Number(i.id) === Number(usuarioId));
  }

  toggleInvitado(usuario: Usuario) {
    if (!this.monitoreo.invitados) this.monitoreo.invitados = [];

    const index = this.monitoreo.invitados.findIndex((i: any) => i.id === usuario.id);

    if (index > -1) {
      // Si estaba, lo quitamos de la lista visual
      this.monitoreo.invitados.splice(index, 1);
    } else {
      // Si no estaba, lo añadimos (mapeado al DTO)
      this.monitoreo.invitados.push({
        id: usuario.id!,
        nombre: usuario.nombre,
        email: usuario.email,
        permiso: usuario.permiso || 'USUARIO'
      });
    }
  }

// monitoreo-editar.ts

  async guardar() {
    try {
      const nombreLimpio = this.monitoreo.nombre?.trim();
      if (!nombreLimpio) {
        alert('El nombre es obligatorio');
        return;
      }

      this.guardando.set(true);
      const id = Number(this.route.snapshot.paramMap.get('id'));

      // 1. Guardar la configuración básica
      const payload = {
        nombre: nombreLimpio,
        url: this.monitoreo.paginaUrl,
        minutos: Number(this.monitoreo.minutos),
        repeticiones: Number(this.monitoreo.repeticiones)
      };
      await firstValueFrom(this.monitoreoService.updateMonitoreo(id, payload));

      // 2. Calcular quién entra y quién sale
      // Extraemos emails y filtramos nulos/undefined para evitar el error de tipos
      const invitadosFinales: string[] = this.monitoreo.invitados
        ?.map((i: any) => i.email)
        .filter((e): e is string => !!e) || [];

      const correosAAnadir = invitadosFinales.filter(email => !this.invitadosOriginales.includes(email));
      const correosAQuitar = this.invitadosOriginales.filter(email => !invitadosFinales.includes(email));

      // --- CAMBIO CLAVE: LLAMADAS MASIVAS ---

      // Si hay correos para añadir, enviamos una sola petición para este ID
      if (correosAAnadir.length > 0) {
        await firstValueFrom(this.monitoreoService.invitacionEnMasa([id], correosAAnadir));
      }

      // Si hay correos para quitar, enviamos una sola petición para este ID
      if (correosAQuitar.length > 0) {
        await firstValueFrom(this.monitoreoService.quitarEnMasa([id], correosAQuitar));
      }

      this.router.navigate(['/dashboard/monitoreos']);

    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios");
    } finally {
      this.guardando.set(false);
    }
  }
}
