import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MonitoreoService } from '../../services/monitoreo.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-monitoreo-anyadir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './monitoreo-anyadir.html'
})
export class MonitoreoAnyadir implements OnInit {
  private monitoreoService = inject(MonitoreoService);
  private router = inject(Router);

  // Formulario
  nombre = '';
  urlSeleccionada = ''; // Aquí guardaremos la URL elegida del select
  minutos = 5;
  repeticiones = 3;

  // Lista de páginas desde el Back
  paginasExistentes = signal<any[]>([]);
  cargando = signal(false);

  async ngOnInit() {
    try {
      // Cargamos todas las páginas disponibles para el select
      const paginas = await firstValueFrom(this.monitoreoService.obtenerTodasLasPaginas());
      this.paginasExistentes.set(paginas);
    } catch (e) {
      console.error("Error al cargar las páginas existentes", e);
    }
  }

  async guardar() {

    const nombreLimpio = this.nombre.trim();

    if (!nombreLimpio || !this.urlSeleccionada) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    // VALIDACIÓN DE NÚMEROS
    if (this.minutos < 1) {
      alert("La frecuencia mínima es de 1 minuto.");
      return;
    }
    if (this.repeticiones < 0) {
      alert("Los reintentos no pueden ser negativos.");
      return;
    }

    if (!this.nombre || !this.urlSeleccionada) {
      alert("Por favor, rellena todos los campos");
      return;
    }

    try {
      this.cargando.set(true);

      // El payload exacto que espera tu @PostMapping en MonitoreoController.java
      const payload = {
        nombre: this.nombre,
        url: this.urlSeleccionada, // La URL de la página seleccionada
        minutos: this.minutos,
        repeticiones: this.repeticiones
      };

      await firstValueFrom(this.monitoreoService.crearMonitoreo(payload));

      // Si todo sale bien, volvemos a la lista
      this.router.navigate(['/dashboard/monitoreos']);
    } catch (error) {
      console.error("Error al crear el monitoreo:", error);
      alert("Hubo un error al crear el monitoreo.");
    } finally {
      this.cargando.set(false);
    }
  }
}
