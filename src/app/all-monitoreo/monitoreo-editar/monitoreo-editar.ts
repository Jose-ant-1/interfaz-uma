import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import { MonitoreoDTODetalle } from '../../models/monitoreo.model';
import { MonitoreoService } from '../../services/monitoreo.service';
import { Pagina } from '../../models/pagina.model';
import { PaginaService } from '../../services/pagina.service';

@Component({
  selector: 'app-monitoreo-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './monitoreo-editar.html'
})
export class MonitoreoEditar implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly monitoreoService = inject(MonitoreoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paginaService = inject(PaginaService);

  paginasDisponibles = signal<Pagina[]>([]);
  usuarioLogueadoId = signal<number | null>(null);
  usuariosSistema = signal<Usuario[]>([]);
  cargando = signal(true);
  guardando = signal(false); // Para bloquear el botón mientras guarda

  monitoreo: Partial<MonitoreoDTODetalle> = {
    nombre: '',
    minutos: 1,
    repeticiones: 1,
    paginaUrl: ''
  };

  invitadosOriginales: string[] = [];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const monitoreoId = Number(id);
      this.cargarMonitoreo(monitoreoId);
      this.cargarUsuariosDelSistema();
      this.cargarPaginas();
    }
  }

  cargarPaginas() {
    this.paginaService.getPaginas().subscribe({
      next: (paginas) => {
        this.paginasDisponibles.set(paginas);
      },
      error: (err) => {
        console.error('Error al cargar las páginas:', err);
      }
    });
  }

  cargarMonitoreo(id: number) {
    this.monitoreoService.getMonitoreoPorId(id).subscribe({
      next: (data) => {
        this.monitoreo = data;

        // Guardamos los emails originales para saber a quién quitar/poner luego
        this.invitadosOriginales = data.invitados?.map(i => i.email).filter(e => !!e) || [];

        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el monitoreo:', err);
        this.cargando.set(false);
      }
    });
  }

  cargarUsuariosDelSistema() {
    this.usuarioService.getUsuarios().subscribe({
      next: (users) => {
        // Filtramos para que el dueño no se invite a sí mismo
        const listaFiltrada = users.filter(u => u.id !== this.usuarioLogueadoId());
        this.usuariosSistema.set(listaFiltrada);
      },
      error: (err) => {
        console.error('Error al obtener usuarios del sistema:', err);
      }
    });
  }

  esInvitado(userId: number): boolean {
    if (!this.monitoreo.invitados) return false;
    return this.monitoreo.invitados.some(i => i.id === userId);
  }

  toggleInvitado(user: Usuario) {
    this.monitoreo.invitados ??= [];

    const index = this.monitoreo.invitados.findIndex(i => i.id === user.id);

    if (index > -1) {
      // Si ya está, lo quitamos de la lista local
      this.monitoreo.invitados.splice(index, 1);
    } else {
      // Si no está, lo añadimos
      this.monitoreo.invitados.push({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        permiso: user.permiso
      } as any);
    }
  }

  async guardar() {
    if (!this.monitoreo.nombre || !this.monitoreo.paginaUrl) return;

    const nombreLimpio = this.monitoreo.nombre.trim();
    if (nombreLimpio.length < 3) return;

    this.guardando.set(true);

    try {
      const id = Number(this.route.snapshot.paramMap.get('id'));

      // 1. Guardar la configuración básica
      const payload = {
        nombre: nombreLimpio,
        paginaUrl: this.monitoreo.paginaUrl,
        minutos: Number(this.monitoreo.minutos),
        repeticiones: Number(this.monitoreo.repeticiones)
      };

      await firstValueFrom(this.monitoreoService.updateMonitoreo(id, payload));

      // 2. Calcular quién entra y quién sale
      const invitadosFinales: string[] = this.monitoreo.invitados
        ?.map((i: any) => i.email)
        .filter((e): e is string => !!e) || [];

      const correosAAnadir = invitadosFinales.filter(email => !this.invitadosOriginales.includes(email));
      const correosAQuitar = this.invitadosOriginales.filter(email => !invitadosFinales.includes(email));

      // 3. Peticiones de invitación / eliminación en masa
      if (correosAAnadir.length > 0) {
        await firstValueFrom(this.monitoreoService.invitacionEnMasa([id], correosAAnadir));
      }

      if (correosAQuitar.length > 0) {
        await firstValueFrom(this.monitoreoService.quitarEnMasa([id], correosAQuitar));
      }

      // 4. Redirigir al finalizar
      this.router.navigate(['/dashboard/monitoreos']);

    } catch (error) {
      console.error('Error al guardar el monitoreo:', error);
    } finally {
      this.guardando.set(false);
    }
  }
}
