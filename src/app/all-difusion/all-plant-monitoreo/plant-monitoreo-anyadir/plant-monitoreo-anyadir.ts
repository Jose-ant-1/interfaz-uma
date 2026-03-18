import {Component, inject, signal, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterModule, Router} from '@angular/router';
import {PlantillaMonitoreoService} from '../../../services/plantilla-monitoreo.service';
import {MonitoreoService} from '../../../services/monitoreo.service';
import {PlantillaMonitoreo} from '../../../models/plantilla-monitoreo';

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
  misMonitoreos = signal<any[]>([]);
  seleccionados = signal<number[]>([]);
  cargando = signal(false);

  ngOnInit() {
    // Cargamos los monitoreos del usuario para que pueda elegir
    this.monitoreoService.getMisMonitoreos().subscribe(res => {
      this.misMonitoreos.set(res);
    });
  }

  toggleMonitoreo(id: number) {
    const actual = this.seleccionados();
    if (actual.includes(id)) {
      this.seleccionados.set(actual.filter(i => i !== id));
    } else {
      this.seleccionados.set([...actual, id]);
    }
  }

  estaSeleccionado(id: number) {
    return this.seleccionados().includes(id);
  }

  guardar() {
    this.cargando.set(true);

    // TypeScript validará que este objeto cumple con la interfaz PlantillaMonitoreo
    const nuevaPlantilla: PlantillaMonitoreo = {
      nombre: this.nombrePlantilla,
      monitoreos: this.seleccionados().map(id => ({id}))
    };

    this.plantillaService.create(nuevaPlantilla).subscribe({
      next: () => this.router.navigate(['/dashboard/difusion-masiva']),
      error: () => this.cargando.set(false)
    });
  }
}
