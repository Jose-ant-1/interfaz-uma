import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { firstValueFrom } from 'rxjs';
import { PlantillaMonitoreo } from '../../../models/plantilla-monitoreo';

@Component({
  selector: 'app-plantilla-monitoreo-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plant-monitoreo-lista.html'
})
export class PlantMonitoreoLista implements OnInit {
  private readonly plantillaService = inject(PlantillaMonitoreoService);

  plantillas = signal<PlantillaMonitoreo[]>([]);
  cargando = signal(true);
  filtro = signal('');

  // Ahora solo filtra; el orden viene listo desde el Back-end
  plantillasFiltradas = computed(() => {
    const term = this.filtro().toLowerCase().trim();
    if (!term) return this.plantillas();

    return this.plantillas().filter(p =>
      p.nombre.toLowerCase().includes(term)
    );
  });

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  async cargarPlantillas() {
    try {
      this.cargando.set(true);
      const data = await firstValueFrom(this.plantillaService.findAll());
      this.plantillas.set(data || []);
    } catch (error) {
      console.error("Error al cargar plantillas", error);
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarPlantilla(id: number) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return;

    try {
      await firstValueFrom(this.plantillaService.delete(id));
      this.plantillas.update(list => list.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  }
}
