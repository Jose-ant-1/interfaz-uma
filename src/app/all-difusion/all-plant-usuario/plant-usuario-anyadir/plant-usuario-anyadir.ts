import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { UsuarioService } from '../../../services/usuario.service';
import { PlantillaUsuario } from '../../../models/plantilla-usuario';
import { Usuario } from '../../../models/usuario.model';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-plant-usuario-anyadir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plant-usuario-anyadir.html'
})
export class PlantUsuarioAnyadir implements OnInit {
  private plantillaUsuarioService = inject(PlantillaUsuarioService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);

  nombreGrupo = '';
  usuariosDisponibles = signal<Usuario[]>([]);
  seleccionados = signal<number[]>([]);
  cargando = signal(false);

  async ngOnInit() {
    try {
      this.cargando.set(true);

      // Obtenemos el perfil y la lista de usuarios en paralelo para ganar velocidad
      const [miPerfil, todosLosUsuarios] = await Promise.all([
        firstValueFrom(this.usuarioService.getPerfil()),
        firstValueFrom(this.usuarioService.getUsuarios())
      ]);

      // Solo incluimos usuarios que tengan ID y cuyo ID no sea el nuestro
      const listaSinMi = todosLosUsuarios.filter(u =>
        u.id !== undefined && u.id !== miPerfil.id
      );

      this.usuariosDisponibles.set(listaSinMi);

    } catch (error) {
      console.error("Error al inicializar el componente:", error);
    } finally {
      this.cargando.set(false);
    }
  }

  toggleUsuario(id: number) {
    const actual = this.seleccionados();
    if (actual.includes(id)) {
      this.seleccionados.set(actual.filter(i => i !== id));
    } else {
      this.seleccionados.set([...actual, id]);
    }
  }

  estaSeleccionado(id: number) {
    return this.seleccionados().includes(id);
  }

  guardar() {
    if (!this.nombreGrupo || this.seleccionados().length === 0) return;

    this.cargando.set(true);

    const nuevoGrupo: PlantillaUsuario = {
      nombre: this.nombreGrupo,
      usuarios: this.seleccionados().map(id => ({ id }))
    };

    this.plantillaUsuarioService.create(nuevoGrupo).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/difusion/administrar-grupos']);
      },
      error: (err) => {
        console.error("Error al crear el grupo:", err);
        this.cargando.set(false);
        alert("Ocurrió un error al guardar el grupo.");
      }
    });
  }
}
