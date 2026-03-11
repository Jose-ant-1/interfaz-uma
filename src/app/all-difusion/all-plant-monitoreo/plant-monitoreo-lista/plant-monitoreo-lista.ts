import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-plantilla-monitoreo-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './plant-monitoreo-lista.html'
})
export class PlantMonitoreoLista implements OnInit {
  private readonly plantillaService = inject(PlantillaMonitoreoService);
  private readonly monitoreoService = inject(MonitoreoService);

  plantillas = signal<any[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  async cargarPlantillas() {
    try {
      this.cargando.set(true);
      const perfil = await firstValueFrom(this.monitoreoService.getPerfil());
      const data = await firstValueFrom(this.plantillaService.findByPropietario(perfil.id));
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
