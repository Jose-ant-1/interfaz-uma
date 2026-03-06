// monitoreo-card.ts
import { Component, inject, Input, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth'; // Asegúrate de que la ruta es correcta

@Component({
  selector: 'app-monitoreo-card',
  standalone: true,
  templateUrl: './monitoreo-card.html',
})
export class MonitoreoCard {
  @Input() monitoreo!: any;
  @Input() isAdmin = false;
  private router = inject(Router);
  private authService = inject(AuthService);

  // 1. Comparamos el ID del usuario logueado con el ID del propietario del monitoreo
  esPropietario = computed(() => {
    const logueadoId = this.authService.userId();
    // En el listado el backend envía 'propietarioId'
    const propId = this.monitoreo.propietarioId;
    if (!logueadoId || !propId) return false;
    return Number(logueadoId) === Number(propId);
  });

  estadoVisual = computed(() => {
    const code = this.monitoreo.estado || this.monitoreo.ultimoEstado;
    if (code === undefined || code === null) return 'CHECKING';
    if (code >= 200 && code < 300) return 'ONLINE';
    return 'OFFLINE';
  });

  // Métodos para los botones
  editarMonitoreo() {
    this.router.navigate(['/dashboard/monitoreo/edit', this.monitoreo.id]);
  }

  eliminarMonitoreo() {
    if (confirm(`¿Eliminar monitoreo: ${this.monitoreo.nombre}?`)) {
      // Aquí llamarías a tu servicio para borrar
      console.log('Borrando monitoreo id:', this.monitoreo.id);
    }
  }

  verDetalles() {
    this.router.navigate(['/dashboard/monitoreo', this.monitoreo.id]);
  }
}
