import { Component, OnInit, inject, signal, computed } from '@angular/core'; // Añadido computed
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MonitoreoService } from '../services/monitoreo.service'; // Asegúrate de que la ruta sea correcta

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.html'
})
export class PerfilComponent implements OnInit {
  private http = inject(HttpClient);
  private monitoreoService = inject(MonitoreoService);

  usuario = signal<any>(null);
  monitoreos = signal<any[]>([]); // Almacenamos la lista completa

  // Filtramos los que son propios (propietarioId coincide con el ID del usuario)
  propiosCount = computed(() =>
    this.monitoreos().filter(m => m.propietarioId === this.usuario()?.id).length
  );

  // Filtramos los que son compartidos (aquellos donde NO es el propietario)
  invitadoCount = computed(() =>
    this.monitoreos().filter(m => m.propietarioId !== this.usuario()?.id).length
  );

  ngOnInit() {
    const token = localStorage.getItem('authData');
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });

    // 1. Cargar datos del usuario
    this.http.get('http://localhost:8080/api/usuarios/me', { headers }).subscribe({
      next: (data) => {
        this.usuario.set(data);
        // 2. Una vez tenemos el usuario, cargamos sus monitoreos
        this.cargarMonitoreos();
      },
      error: (err) => console.error("Error al obtener perfil:", err)
    });
  }

  cargarMonitoreos() {
    this.monitoreoService.getMisMonitoreos().subscribe({
      next: (data) => this.monitoreos.set(data),
      error: (err) => console.error("Error al cargar estadísticas", err)
    });
  }
}
