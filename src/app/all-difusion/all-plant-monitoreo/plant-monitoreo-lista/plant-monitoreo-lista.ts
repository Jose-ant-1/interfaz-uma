import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { firstValueFrom } from 'rxjs';
import {PlantillaMonitoreo} from '../../../models/plantilla-monitoreo';

@Component({
  selector: 'app-plantilla-monitoreo-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './plant-monitoreo-lista.html'
})
export class PlantMonitoreoLista implements OnInit {
  private readonly plantillaService = inject(PlantillaMonitoreoService);

  plantillas = signal<PlantillaMonitoreo[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  async cargarPlantillas() {
    try {
      this.cargando.set(true);

      const data = await firstValueFrom(this.plantillaService.findAll());

      console.log("Nuevos datos recibidos:", data);
      this.plantillas.set(data);
    } catch (error) {
      console.error("Error al cargar plantillas", error);
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarPlantilla(id: number) {
    if (confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      try {
        await firstValueFrom(this.plantillaService.delete(id));
        this.plantillas.update(list => list.filter(p => p.id !== id));
      } catch (error) {
        alert("No se pudo eliminar la plantilla");
      }
    }
  }
}
