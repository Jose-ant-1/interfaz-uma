import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { MonitoreoService } from '../../services/monitoreo.service';
import { AuthService } from '../../services/auth';
import { MonitoreoCard } from '../monitoreo-card/monitoreo-card';
import { interval, Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-monitoreo-lista',
  standalone: true,
  imports: [ MonitoreoCard ],
  templateUrl: './monitoreo-lista.html',
})
export class MonitoreoLista implements OnInit, OnDestroy {
  private monitoreoService = inject(MonitoreoService);
  private authService = inject(AuthService);
  private refreshSub?: Subscription;

  // Creamos dos señales separadas
  misMonitoreos = signal<any[]>([]);
  colaboraciones = signal<any[]>([]);

  userRole = this.authService.userRole;

  ngOnInit() {
    this.cargarTodo();

    // Actualización automática cada 30 segundos para ambas listas
    this.refreshSub = interval(30000).subscribe(() => {
      this.cargarTodo();
    });
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  cargarTodo() {
    // Usamos forkJoin para disparar ambas peticiones a la vez
    forkJoin({
      propios: this.monitoreoService.getMisMonitoreos(),
      invitado: this.monitoreoService.getColaboraciones()
    }).subscribe({
      next: (res) => {
        this.misMonitoreos.set(res.propios);
        this.colaboraciones.set(res.invitado);
      },
      error: (err) => console.error('Error al cargar listas de monitoreo', err)
    });
  }
}
