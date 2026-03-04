import { Component, inject, Input, computed } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-monitoreo-card',
  standalone: true,
  templateUrl: './monitoreo-card.html',
})
export class MonitoreoCard {
  @Input() monitoreo!: any;
  @Input() isAdmin = false;
  private router = inject(Router);

  estadoVisual = computed(() => {
    // Intentamos leer 'estado' (el de la entidad) o 'ultimoEstado' (el del DTO)
    const code = this.monitoreo.estado || this.monitoreo.ultimoEstado;

    console.log('Código detectado para', this.monitoreo.nombre, ':', code);

    if (code === undefined || code === null) return 'CHECKING';
    if (code >= 200 && code < 300) return 'ONLINE';
    return 'OFFLINE';
  });

  verDetalles() {
    this.router.navigate(['/dashboard/pagina', this.monitoreo.id]);
  }
}
