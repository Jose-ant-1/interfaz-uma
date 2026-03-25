import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { firstValueFrom } from 'rxjs';
import { PlantillaUsuario } from '../../../models/plantilla-usuario';

@Component({
  selector: 'app-plant-usuario-lista',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plant-usuario-lista.html'
})
export class PlantUsuarioLista implements OnInit {
  private readonly plantillaUsuarioService = inject(PlantillaUsuarioService);

  plantillas = signal<PlantillaUsuario[]>([]);
  cargando = signal(true);
  filtro = signal('');

  // Solo filtramos los resultados que el Back ya nos dio ordenados
  plantillasFiltradas = computed(() => {
    const term = this.filtro().toLowerCase().trim();
    if (!term) return this.plantillas();

    return this.plantillas().filter(p =>
      p.nombre.toLowerCase().includes(term)
    );
  });

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  async cargarPlantillas() {
    try {
      this.cargando.set(true);
      const data = await firstValueFrom(this.plantillaUsuarioService.findAll());
      this.plantillas.set(data || []);
    } catch (error) {
      console.error("Error al cargar grupos de usuarios", error);
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarGrupo(id: number) {
    if (!confirm('¿Estás seguro de que quieres eliminar este grupo?')) return;

    try {
      await firstValueFrom(this.plantillaUsuarioService.delete(id));
      this.plantillas.update(list => list.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error al eliminar grupo:", error);
    }
  }
}
