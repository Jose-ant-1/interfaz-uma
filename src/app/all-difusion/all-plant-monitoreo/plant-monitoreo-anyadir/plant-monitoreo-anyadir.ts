import {Component, inject, signal, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterModule, Router} from '@angular/router';
import {PlantillaMonitoreoService} from '../../../services/plantilla-monitoreo.service';
import {MonitoreoService} from '../../../services/monitoreo.service';
import {PlantillaMonitoreo} from '../../../models/plantilla-monitoreo';
import {MonitoreoListadoDTO} from '../../../models/monitoreo.model';

@Component({
  selector: 'app-plantilla-anyadir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plant-monitoreo-anyadir.html'
})
export class PlantMonitoreoAnyadir implements OnInit {
  private plantillaService = inject(PlantillaMonitoreoService);
  private monitoreoService = inject(MonitoreoService);
  private router = inject(Router);

  nombrePlantilla = '';
  misMonitoreos = signal<MonitoreoListadoDTO[]>([]);
  seleccionados = signal<number[]>([]);
  cargando = signal(false);

  ngOnInit() {
    this.monitoreoService.getMisMonitoreos().subscribe(res => {
      this.misMonitoreos.set(res);
    });
  }

  toggleMonitoreo(id: number) {
    this.seleccionados.update(actual =>
      actual.includes(id)
        ? actual.filter(i => i !== id)
        : [...actual, id]
    );
  }


  estaSeleccionado(id: number) {
    return this.seleccionados().includes(id);
  }

  guardar() {
    this.cargando.set(true);
    // Esto ya lo tenías bien, es el camino a seguir:
    const nuevaPlantilla: PlantillaMonitoreo = {
      nombre: this.nombrePlantilla,
      monitoreos: this.seleccionados().map(id => ({ id }))
    };

    this.plantillaService.create(nuevaPlantilla).subscribe({
      next: () => this.router.navigate(['/dashboard/difusion-masiva']),
      error: () => this.cargando.set(false)
    });
  }
}
