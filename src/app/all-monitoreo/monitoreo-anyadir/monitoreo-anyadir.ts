import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MonitoreoService } from '../../services/monitoreo.service';
import { PaginaService } from '../../services/pagina.service';
import { firstValueFrom } from 'rxjs';
import { Pagina } from '../../models/pagina.model';

@Component({
  selector: 'app-monitoreo-anyadir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './monitoreo-anyadir.html'
})
export class MonitoreoAnyadir implements OnInit {
  private monitoreoService = inject(MonitoreoService);
  private paginaService = inject(PaginaService);
  private router = inject(Router);

  nombre = '';
  urlSeleccionada = '';
  minutos = 5;
  repeticiones = 3;

  paginasExistentes = signal<Pagina[]>([]);
  cargando = signal(false);

  async ngOnInit() {
    try {
      const paginas = await firstValueFrom(this.paginaService.getPaginas());
      this.paginasExistentes.set(paginas);
    } catch (e) {
      console.error("Error al cargar las páginas desde PaginaService", e);
    }
  }

  async guardar() {
    const nombreLimpio = this.nombre.trim();

    if (!nombreLimpio || !this.urlSeleccionada) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    if (this.minutos < 1 || this.repeticiones < 0) {
      alert("Valores de tiempo o reintentos no válidos.");
      return;
    }

    try {
      this.cargando.set(true);

      const payload = {
        nombre: nombreLimpio,
        paginaUrl: this.urlSeleccionada,
        minutos: this.minutos,
        repeticiones: this.repeticiones
      };

      await firstValueFrom(this.monitoreoService.crearMonitoreo(payload));
      this.router.navigate(['/dashboard/monitoreos']);
    } catch (error) {
      console.error("Error al crear el monitoreo:", error);
      alert("Hubo un error al crear el monitoreo.");
    } finally {
      this.cargando.set(false);
    }
  }
}
