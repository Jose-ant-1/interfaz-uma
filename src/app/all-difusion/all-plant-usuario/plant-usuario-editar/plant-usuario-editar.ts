import {Component, computed, inject, OnInit, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';
import { firstValueFrom } from 'rxjs';
import {PlantillaUsuario} from '../../../models/plantilla-usuario';

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

      const [miPerfil, todosLosUsuarios, grupo] = await Promise.all([
        firstValueFrom(this.usuarioService.getPerfil()),
        firstValueFrom(this.usuarioService.getUsuarios()),
        firstValueFrom(this.plantillaUsuarioService.findById(this.idGrupo))
      ]);

      if (grupo) {
        this.nombreGrupo = grupo.nombre;

        // Extraemos los IDs que ya están en el grupo
        const idsActuales = (grupo.usuarios || [])
          .filter(u => u.id !== undefined)
          .map(u => u.id as number);
        this.seleccionados.set(idsActuales);

        // Filtramos para no incluirte a ti mismo
        const usuariosSinMi = todosLosUsuarios.filter(u =>
          u.id !== undefined && u.id !== miPerfil.id
        );

        // Seleccionados primero, manteniendo el orden A-Z de la API
        const marcados = usuariosSinMi.filter(u => idsActuales.includes(u.id!));
        const noMarcados = usuariosSinMi.filter(u => !idsActuales.includes(u.id!));

        // Unimos ambas listas, primero los que están dentro, luego los que no
        this.usuariosDisponibles.set([...marcados, ...noMarcados]);

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

      const payload: PlantillaUsuario = {
        id: this.idGrupo,
        nombre: this.nombreGrupo,
        usuarios: this.seleccionados().map(id => ({ id }))
      };

      await firstValueFrom(this.plantillaUsuarioService.update(this.idGrupo, payload));
      this.router.navigate(['/dashboard/difusion/administrar-grupos']);
    } catch (error) {
      console.error("Error al actualizar el grupo:", error);
      alert("No se pudo actualizar el grupo de usuarios.");
    } finally {
      this.cargando.set(false);
    }
  }

  filtro = signal('');

  usuariosFiltrados = computed(() => {
    const busqueda = this.filtro().toLowerCase().trim();
    const lista = this.usuariosDisponibles();

    if (!busqueda) return lista;

    return lista.filter(u =>
      u.nombre.toLowerCase().includes(busqueda) ||
      u.email.toLowerCase().includes(busqueda)
    );
  });

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filtro.set(value);
  }


}
