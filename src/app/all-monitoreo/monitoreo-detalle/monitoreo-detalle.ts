import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MonitoreoService } from '../../services/monitoreo.service';
import {MonitoreoDTODetalle} from '../../models/monitoreo.model';

@Component({
  selector: 'app-monitoreo-detalles',
  templateUrl: './monitoreo-detalle.html',
  standalone: true,
  imports: [RouterLink, CommonModule]
})
export class MonitoreoDetalles implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private monitoreoService = inject(MonitoreoService);

  // Signal con el tipo MonitoreoDTODetalle
  monitoreo = signal<MonitoreoDTODetalle | null>(null);
  isAdmin = signal<boolean>(false);
  esDuenio = signal<boolean>(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const role = localStorage.getItem('userRole');
    this.isAdmin.set(role?.toUpperCase() === 'ADMIN');

    if (id) {
      this.cargarDatos(Number(id));
    }

  }

  private cargarDatos(id: number) {
    this.monitoreoService.getMonitoreoPorId(id).subscribe({
      next: (data) => {
        this.monitoreo.set(data);

        // Obtenemos nuestro ID (sesión)
        const miId = Number(localStorage.getItem('userId'));

        // Verificamos si mi ID coincide con el ID del propietario que viene en el DTO
        this.esDuenio.set(data.propietario.id === miId);
      },
      error: (err) => console.error("Error al cargar detalles:", err)
    });
  }

}
