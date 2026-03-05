// En perfil.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoreoService } from '../services/monitoreo.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.html'
})
export class PerfilComponent implements OnInit {
  private monitoreoService = inject(MonitoreoService);

  usuario = signal<any>(null);
  monitoreosPropios = signal<any[]>([]);
  monitoreosInvitado = signal<any[]>([]);

  // Los contadores ahora son simples y directos
  propiosCount = computed(() => this.monitoreosPropios().length);
  invitadoCount = computed(() => this.monitoreosInvitado().length);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    // 1. Cargamos el perfil
    this.monitoreoService.getPerfil().subscribe({
      next: (user) => this.usuario.set(user),
      error: (err) => console.error("Error al obtener perfil", err)
    });

    // 2. Cargamos monitoreos propios
    this.monitoreoService.getMisMonitoreos().subscribe({
      next: (data) => this.monitoreosPropios.set(data),
      error: (err) => console.error("Error cargando propios", err)
    });

    // 3. Cargamos colaboraciones (invitaciones)
    this.monitoreoService.getColaboraciones().subscribe({
      next: (data) => this.monitoreosInvitado.set(data),
      error: (err) => console.error("Error cargando colaboraciones", err)
    });
  }
}
