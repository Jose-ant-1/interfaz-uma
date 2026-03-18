import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-plant-usuario-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './plant-usuario-editar.html'
})

export class PlantUsuarioEditar implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plantillaUsuarioService = inject(PlantillaUsuarioService);
  private readonly usuarioService = inject(UsuarioService);

  idGrupo!: number;
  nombreGrupo = '';
  usuariosDisponibles = signal<Usuario[]>([]);
  seleccionados = signal<number[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.idGrupo = Number(idParam);
      await this.cargarDatos();
    }
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);

      // Obtenemos perfil, todos los usuarios y el grupo actual en paralelo
      const [miPerfil, todosLosUsuarios, grupo] = await Promise.all([
        firstValueFrom(this.usuarioService.getPerfil()),
        firstValueFrom(this.usuarioService.getUsuarios()),
        firstValueFrom(this.plantillaUsuarioService.findById(this.idGrupo))
      ]);

      // Filtramos la lista para que NO aparezcas tú (basado en el ID de tu perfil)
      const usuariosSinMi = todosLosUsuarios.filter(u =>
        u.id !== undefined && u.id !== miPerfil.id
      );
      this.usuariosDisponibles.set(usuariosSinMi);

      // Cargamos los datos del grupo
      if (grupo) {
        this.nombreGrupo = grupo.nombre;
        if (grupo.usuarios) {
          const idsActuales = grupo.usuarios
            .filter(u => u.id !== undefined)
            .map(u => u.id as number);
          this.seleccionados.set(idsActuales);
        }
      } else {
        this.router.navigate(['/dashboard/difusion/administrar-grupos']);
      }
    } catch (error) {
      console.error("Error al cargar datos del grupo:", error);
    } finally {
      this.cargando.set(false);
    }
  }

  toggleUsuario(id: number) {
    this.seleccionados.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().includes(id);
  }

  async actualizar() {
    if (!this.nombreGrupo || this.seleccionados().length === 0) return;

    try {
      this.cargando.set(true);

      const payload = {
        id: this.idGrupo,
        nombre: this.nombreGrupo,
        usuarios: this.seleccionados().map(id => ({ id }))
      };

      await firstValueFrom(this.plantillaUsuarioService.update(this.idGrupo, payload as any));
      this.router.navigate(['/dashboard/difusion/administrar-grupos']);
    } catch (error) {
      console.error("Error al actualizar el grupo:", error);
      alert("No se pudo actualizar el grupo de usuarios.");
    } finally {
      this.cargando.set(false);
    }
  }
}
