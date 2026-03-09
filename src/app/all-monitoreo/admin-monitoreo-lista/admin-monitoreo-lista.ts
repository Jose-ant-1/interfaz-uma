import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoreoService } from '../../services/monitoreo.service';
import { MonitoreoCard } from '../componentes-monitoreo/monitoreo-card/monitoreo-card';

@Component({
  selector: 'app-admin-monitoreo-lista',
  standalone: true,
  imports: [CommonModule, MonitoreoCard],
  templateUrl: 'admin-monitoreo-lista.html'
})
export class AdminMonitoreoListaComponent implements OnInit {
  private monitoreoService = inject(MonitoreoService);
  monitoreos = signal<any[]>([]);

  ngOnInit() {
    this.monitoreoService.obtenerTodosLosMonitoreos().subscribe({
      next: (data) => this.monitoreos.set(data),
      error: (err) => console.error('Error de acceso admin:', err)
    });
  }
}
