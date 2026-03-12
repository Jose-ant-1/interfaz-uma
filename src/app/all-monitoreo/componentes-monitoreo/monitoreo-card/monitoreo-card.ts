import { Component, inject, Input, computed, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { MonitoreoService } from '../../../services/monitoreo.service'; // Inyectamos el servicio
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-monitoreo-card',
  standalone: true,
  templateUrl: './monitoreo-card.html',
  imports: [RouterLink] // Importante para que funcionen los routerLink en el HTML
})
export class MonitoreoCard {
  @Input() monitoreo!: any;
  @Input() isAdmin = false;

  @Output() eliminado = new EventEmitter<void>(); // Para que la lista se refresque

  private router = inject(Router);
  private authService = inject(AuthService);
  private monitoreoService = inject(MonitoreoService);

  esPropietario = computed(() => {
    const logueadoId = this.authService.userId();
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

  // Método corregido para llamar al service
  async eliminarMonitoreo(id: number) {
    if (confirm(`¿Eliminar monitoreo: ${this.monitoreo.nombre}?`)) {
      try {
        await firstValueFrom(this.monitoreoService.eliminarMonitoreo(id));
        this.eliminado.emit(); // Avisamos al componente padre
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  }
}
