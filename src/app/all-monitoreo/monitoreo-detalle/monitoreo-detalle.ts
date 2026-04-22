import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MonitoreoService } from '../../services/monitoreo.service';
import { MonitoreoDTODetalle } from '../../models/monitoreo.model';

@Component({
  selector: 'app-monitoreo-detalles',
  templateUrl: './monitoreo-detalle.html',
  standalone: true,
  imports: [RouterLink, CommonModule]
})
export class MonitoreoDetalles implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly monitoreoService = inject(MonitoreoService);

  // Signals de Estado
  monitoreo = signal<MonitoreoDTODetalle | null>(null);
  isAdmin = signal<boolean>(false);
  esDuenio = signal<boolean>(false);
  cargando = signal<boolean>(true); // Pilar: Estado de Carga
  errorCarga = signal<string | null>(null); // Pilar: Manejo de Errores

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    // Seteamos roles desde el inicio
    const role = localStorage.getItem('userRole');
    this.isAdmin.set(role?.toUpperCase() === 'ADMIN');

    if (id) {
      this.inicializarDatos(Number(id));
    } else {
      this.errorCarga.set('ID de monitoreo no válido');
      this.cargando.set(false);
    }
  }

  // Orquestador de carga asíncrona (Pilar: Integridad)

  private async inicializarDatos(id: number): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);

    try {
      // Usamos await para garantizar que el flujo sea lineal y testeable
      const data = await firstValueFrom(this.monitoreoService.getMonitoreoPorId(id));

      if (data) {
        this.monitoreo.set(data);
        this.verificarPropiedad(data);
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      this.errorCarga.set('No se pudo cargar la información del monitoreo');
    } finally {
      this.cargando.set(false);
    }
  }

  // Lógica de validación de negocio: ¿Es el usuario actual el dueño?

  private verificarPropiedad(data: MonitoreoDTODetalle): void {
    const miId = Number(localStorage.getItem('userId'));
    // Añadimos el "?" para evitar el crash si propietario no viene
    this.esDuenio.set(data.propietario?.id === miId);
  }
}
