import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { PlantillaMonitoreo } from '../../../models/plantilla-monitoreo';
import { MonitoreoListadoDTO } from '../../../models/monitoreo.model';

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
  filtro = signal('');

  // Filtra la lista original basándose en el signal 'filtro'
  monitoreosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase().trim();
    const lista = this.misMonitoreos();

    if (!term) return lista;

    return lista.filter(m =>
      m.nombre.toLowerCase().includes(term) ||
      m.id.toString().includes(term)
    );
  });

  ngOnInit() {
    this.monitoreoService.getMisMonitoreos().subscribe(res => {
      this.misMonitoreos.set(res);
    });
  }

  // Actualiza el término de búsqueda
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filtro.set(input.value);
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
    if (!this.nombrePlantilla || this.seleccionados().length === 0) return;

    this.cargando.set(true);
    const nuevaPlantilla: PlantillaMonitoreo = {
      nombre: this.nombrePlantilla,
      monitoreos: this.seleccionados().map(id => ({ id }))
    };

    this.plantillaService.create(nuevaPlantilla).subscribe({
      next: () => this.router.navigate(['/dashboard/difusion/administrar-plantillas']),
      error: () => this.cargando.set(false)
    });
  }
}
