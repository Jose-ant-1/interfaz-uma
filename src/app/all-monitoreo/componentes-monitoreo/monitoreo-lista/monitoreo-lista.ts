import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { AuthService } from '../../../services/auth';
import { MonitoreoCard } from '../monitoreo-card/monitoreo-card';
import { interval, Subscription, forkJoin } from 'rxjs';
import {MonitoreoListadoDTO} from '../../../models/monitoreo.model';

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

  misMonitoreos = signal<MonitoreoListadoDTO[]>([]);
  colaboraciones = signal<MonitoreoListadoDTO[]>([]);

  // Señal para el texto del buscador
  filtroTexto = signal<string>('');

  // Listas filtradas automáticamente
  misMonitoreosFiltrados = computed(() => {
    const term = this.filtroTexto().toLowerCase();
    return this.misMonitoreos().filter(m =>
      m.nombre.toLowerCase().includes(term) || m.paginaUrl.toLowerCase().includes(term)
    );
  });

  colaboracionesFiltradas = computed(() => {
    const term = this.filtroTexto().toLowerCase();
    return this.colaboraciones().filter(m =>
      m.nombre.toLowerCase().includes(term) || m.paginaUrl.toLowerCase().includes(term)
    );
  });

  userRole = this.authService.userRole;

  // metodo para actualizar el filtro desde el HTML
  actualizarFiltro(event: any) {
    this.filtroTexto.set(event.target.value);
  }
  ngOnInit() {
    this.cargarTodo();

    // actualización automática cada 10 segundos para ambas listas
    this.refreshSub = interval(10000).subscribe(() => {
      console.log("recargada")
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
