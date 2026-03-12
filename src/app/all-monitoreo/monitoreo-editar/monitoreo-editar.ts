import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import { MonitoreoDTODetalle } from '../../models/monitoreo.model';
import { MonitoreoService } from '../../services/monitoreo.service';

@Component({
  selector: 'app-monitoreo-editar', // 1. Corregido el selector
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './monitoreo-editar.html'
})
export class MonitoreoEditar implements OnInit { // 2. Corregido el nombre de la clase
  private usuarioService = inject(UsuarioService);
  private monitoreoService = inject(MonitoreoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  usuarioLogueadoId = signal<number | null>(null);
  usuariosSistema = signal<Usuario[]>([]);
  cargando = signal(true);

  monitoreo: Partial<MonitoreoDTODetalle> = {
    nombre: '',
    minutos: 1,
    repeticiones: 3,
    invitados: [] // Importante inicializar esto para el HTML
  };

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    // 1. Cargamos tu perfil
    this.usuarioService.getPerfil().subscribe({
      next: (yo) => {
        this.usuarioLogueadoId.set(yo.id!);
        // 2. Cargamos usuarios filtrando para que no salgas tú
        this.cargarUsuariosSistema();
      }
    });

    // 3. Cargamos solo los datos del MONITOREO
    if (id) {
      this.monitoreoService.getMonitoreoPorId(Number(id)).subscribe({
        next: (data) => {
          this.monitoreo = data;
          this.cargando.set(false);
        },
        error: () => this.router.navigate(['/dashboard/monitoreos'])
      });
    }
  }

  cargarUsuariosSistema() {
    this.usuarioService.getUsuarios().subscribe({
      next: (users) => {
        // FILTRO: Te excluimos de la lista
        const filtrados = users.filter(u => u.id !== this.usuarioLogueadoId());
        this.usuariosSistema.set(filtrados);
      },
      error: (err) => console.error("Error cargando usuarios", err)
    });
  }

  // --- 3. MÉTODOS RECUPERADOS PARA LOS CHECKBOXES DEL HTML ---

  esInvitado(usuarioId: number): boolean {
    if (!this.monitoreo.invitados) return false;
    return this.monitoreo.invitados.some((i: any) => Number(i.id) === Number(usuarioId));
  }

  toggleInvitado(usuario: Usuario) {
    if (!this.monitoreo.id) return;

    this.monitoreoService.invitarUsuario(this.monitoreo.id, usuario.email).subscribe({
      next: () => {
        // Actualizamos visualmente el array local para que el checkbox reaccione
        if (this.esInvitado(usuario.id!)) {
          this.monitoreo.invitados = this.monitoreo.invitados?.filter((i: any) => i.id !== usuario.id);
        } else {
          if (!this.monitoreo.invitados) this.monitoreo.invitados = [];
          this.monitoreo.invitados.push(usuario as any);
        }
      },
      error: (err) => console.error("Error al gestionar invitación", err)
    });
  }

  // --- 4. CORREGIDO EL GUARDADO PARA QUE GUARDE EL MONITOREO ---

  guardar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    const payload = {
      nombre: this.monitoreo.nombre,
      url: this.monitoreo.paginaUrl,
      minutos: Number(this.monitoreo.minutos),
      repeticiones: Number(this.monitoreo.repeticiones)
    };

    this.monitoreoService.updateMonitoreo(id, payload).subscribe({
      next: () => this.router.navigate(['/dashboard/monitoreos']),
      error: (err) => alert('Error al actualizar el monitoreo.')
    });
  }
}
