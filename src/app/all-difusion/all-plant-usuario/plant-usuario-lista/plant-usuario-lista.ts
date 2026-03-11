import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-plant-usuario-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './plant-usuario-lista.html'
})
export class PlantUsuarioLista implements OnInit {
  private readonly plantillaUsuarioService = inject(PlantillaUsuarioService);

  plantillas = signal<any[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    await this.cargarPlantillas();
  }

  async cargarPlantillas() {
    try {
      this.cargando.set(true);
      const data = await firstValueFrom(this.plantillaUsuarioService.findAll());
      this.plantillas.set(data);
    } catch (error) {
      console.error("Error al cargar grupos de usuarios", error);
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarGrupo(id: number) {
    if (confirm('¿Estás seguro de que quieres eliminar este grupo de usuarios?')) {
      try {
        await firstValueFrom(this.plantillaUsuarioService.delete(id));
        this.plantillas.update(list => list.filter(p => p.id !== id));
      } catch (error) {
        alert("No se pudo eliminar el grupo");
      }
    }
  }
}
