import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { firstValueFrom } from 'rxjs';
import {MonitoreoListadoDTO} from '../../../models/monitoreo.model';
import {PlantillaMonitoreo} from '../../../models/plantilla-monitoreo';

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

  async ngOnInit() {
    this.idPlantilla = Number(this.route.snapshot.paramMap.get('id'));
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);
      const monitoreos = await firstValueFrom(this.monitoreoService.getMisMonitoreos());
      this.misMonitoreosDisponibles.set(monitoreos);

      const todas = await firstValueFrom(this.plantillaService.findAll());
      const plantilla = todas.find(p => p.id === this.idPlantilla);

      if (plantilla) {
        this.nombrePlantilla = plantilla.nombre;
        if (plantilla.monitoreos) {
          // CAMBIO: m ya no es any, es parte del DTO
          const idsActuales = plantilla.monitoreos
            .filter(m => m.id !== undefined)
            .map(m => m.id as number);
          this.seleccionados.set(idsActuales);
        }
      }

    } catch (error) {
      console.error("Error:", error);
    } finally {
      this.cargando.set(false);
    }
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
      await this.router.navigate(['/dashboard/difusion/administrar-plantillas']);
    } catch (error) {
      alert("Error al actualizar");
    } finally {
      this.cargando.set(false);
    }
  }
}
