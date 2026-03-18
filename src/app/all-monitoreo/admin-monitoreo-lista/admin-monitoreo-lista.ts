import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoreoService } from '../../services/monitoreo.service';
import { MonitoreoCard } from '../componentes-monitoreo/monitoreo-card/monitoreo-card';

@Component({
  selector: 'app-admin-monitoreo-lista',
  standalone: true,
  imports: [CommonModule, MonitoreoCard, FormsModule],
  templateUrl: 'admin-monitoreo-lista.html'
})
export class AdminMonitoreoListaComponent implements OnInit {
  private monitoreoService = inject(MonitoreoService);

  // Lista original que viene del servidor
  monitoreos = signal<any[]>([]);

  // Término de búsqueda
  searchTerm = signal('');

  // Lista filtrada
  monitoreosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.monitoreos(); // Si no hay búsqueda, devolvemos todo

    return this.monitoreos().filter(m =>
      m.nombre.toLowerCase().includes(term) ||
      m.paginaUrl.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.monitoreoService.obtenerTodosLosMonitoreos().subscribe({
      next: (data) => this.monitoreos.set(data),
      error: (err) => console.error('Error de acceso admin:', err)
    });
  }
}
