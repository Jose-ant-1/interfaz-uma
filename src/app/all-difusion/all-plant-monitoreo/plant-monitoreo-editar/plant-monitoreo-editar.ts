import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { firstValueFrom } from 'rxjs';
import { MonitoreoListadoDTO } from '../../../models/monitoreo.model';
import { PlantillaMonitoreo } from '../../../models/plantilla-monitoreo';

@Component({
  selector: 'app-plantilla-monitoreo-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './plant-monitoreo-editar.html'
})
export class PlantMonitoreoEditar implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plantillaService = inject(PlantillaMonitoreoService);
  private readonly monitoreoService = inject(MonitoreoService);

  idPlantilla!: number;
  nombrePlantilla = '';
  misMonitoreosDisponibles = signal<MonitoreoListadoDTO[]>([]);
  seleccionados = signal<number[]>([]);
  cargando = signal(true);
  filtro = signal('');

  // Buscador
  monitoreosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase().trim();
    const lista = this.misMonitoreosDisponibles();
    if (!term) return lista;
    return lista.filter(m =>
      m.nombre.toLowerCase().includes(term) ||
      m.id.toString().includes(term)
    );
  });

  async ngOnInit() {
    this.idPlantilla = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);

      const [monitoreos, todasLasPlantillas] = await Promise.all([
        firstValueFrom(this.monitoreoService.getMisMonitoreos()),
        firstValueFrom(this.plantillaService.findAll())
      ]);

      const plantilla = todasLasPlantillas.find(p => p.id === this.idPlantilla);

      if (plantilla) {
        this.nombrePlantilla = plantilla.nombre;

        const idsActuales = (plantilla.monitoreos || [])
          .map(m => m.id as number);

        this.seleccionados.set(idsActuales);

        // Agrupación: Seleccionados arriba, manteniendo el orden A-Z que viene del back
        const marcados = monitoreos.filter(m => idsActuales.includes(m.id));
        const noMarcados = monitoreos.filter(m => !idsActuales.includes(m.id));

        this.misMonitoreosDisponibles.set([...marcados, ...noMarcados]);
      } else {
        this.router.navigate(['/dashboard/difusion/administrar-plantillas']);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      this.cargando.set(false);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filtro.set(input.value);
  }

  toggleMonitoreo(id: number) {
    this.seleccionados.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().includes(id);
  }

  async actualizar() {
    if (!this.nombrePlantilla || this.seleccionados().length === 0) return;
    try {
      this.cargando.set(true);
      const payload: PlantillaMonitoreo = {
        id: this.idPlantilla,
        nombre: this.nombrePlantilla,
        monitoreos: this.seleccionados().map(id => ({ id }))
      };

      await firstValueFrom(this.plantillaService.update(this.idPlantilla, payload));
      this.router.navigate(['/dashboard/difusion/administrar-plantillas']);
    } catch (error) {
      console.error("Error al actualizar:", error);
    } finally {
      this.cargando.set(false);
    }
  }
}
