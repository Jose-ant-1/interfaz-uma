import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core'; // Añadido OnDestroy
import { MonitoreoService } from '../../services/monitoreo.service';
import { AuthService } from '../../services/auth';
import { MonitoreoCard } from '../monitoreo-card/monitoreo-card';
import { interval, Subscription } from 'rxjs'; // Necesario para el timer

@Component({
  selector: 'app-monitoreo-lista',
  standalone: true,
  imports: [ MonitoreoCard ],
  templateUrl: './monitoreo-lista.html',
})
export class MonitoreoLista implements OnInit, OnDestroy {
  private monitoreoService = inject(MonitoreoService);
  private authService = inject(AuthService);
  private refreshSub?: Subscription; // Para limpiar el intervalo

  monitoreos = signal<any[]>([]);
  userRole = this.authService.userRole;

  ngOnInit() {
    this.cargarMonitoreos();

    // Creamos un intervalo que sincronice con la frecuencia de la API (30s)
    this.refreshSub = interval(30000).subscribe(() => {
      this.cargarMonitoreos();
      console.log('Dashboard: Datos actualizados del servidor');
    });
  }

  ngOnDestroy() {
    // Es vital desuscribirse para que el timer no siga corriendo en segundo plano
    this.refreshSub?.unsubscribe();
  }

  cargarMonitoreos() {
    this.monitoreoService.getMisMonitoreos().subscribe({
      next: (data) => {
        // Actualizamos el signal con los nuevos estados y fechas
        this.monitoreos.set(data);
      },
      error: (err) => console.error("Error al cargar monitoreos", err)
    });
  }
}
