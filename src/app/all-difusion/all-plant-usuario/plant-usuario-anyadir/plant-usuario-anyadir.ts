import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { UsuarioService } from '../../../services/usuario.service';
import { PlantillaUsuario } from '../../../models/plantilla-usuario';
import { Usuario } from '../../../models/usuario.model';
import { firstValueFrom } from 'rxjs';

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


  filtro = signal('');

  // filtra por nombre o email
  usuariosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase().trim();
    const lista = this.usuariosDisponibles();

    if (!term) return lista;

    return lista.filter(u =>
      u.nombre.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  async ngOnInit() {
    try {
      this.cargando.set(true);
      const [miPerfil, todosLosUsuarios] = await Promise.all([
        firstValueFrom(this.usuarioService.getPerfil()),
        firstValueFrom(this.usuarioService.getUsuarios())
      ]);

      const listaSinMi = todosLosUsuarios.filter(u =>
        u.id !== undefined && u.id !== miPerfil.id
      );

      this.usuariosDisponibles.set(listaSinMi);
    } catch (error) {
      console.error("Error al inicializar:", error);
    } finally {
      this.cargando.set(false);
    }
  }

  // Actualiza el término de búsqueda
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filtro.set(input.value);
  }

  toggleUsuario(id: number) {
    this.seleccionados.update(actual =>
      actual.includes(id) ? actual.filter(i => i !== id) : [...actual, id]
    );
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
      next: () => this.router.navigate(['/dashboard/difusion/administrar-grupos']),
      error: () => this.cargando.set(false)
    });
  }
}
