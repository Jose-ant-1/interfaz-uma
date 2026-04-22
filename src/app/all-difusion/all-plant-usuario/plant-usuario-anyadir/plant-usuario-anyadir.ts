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
  private readonly plantillaUsuarioService = inject(PlantillaUsuarioService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);

  // --- ESTADO (Signals) ---
  nombreGrupo = '';
  usuariosDisponibles = signal<Usuario[]>([]);
  seleccionados = signal<number[]>([]);
  cargando = signal(false);
  filtro = signal('');

  // --- LÓGICA DE NEGOCIO (Computed) ---
  usuariosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase().trim();
    const lista = this.usuariosDisponibles();

    if (!term) return lista;

    return lista.filter(u =>
      u.nombre.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    void this.inicializarComponente();
  }

  private async inicializarComponente() {
    try {
      this.cargando.set(true);

      // Pilar: Integridad de Datos (Carga paralela)
      const [miPerfil, todosLosUsuarios] = await Promise.all([
        firstValueFrom(this.usuarioService.getPerfil()),
        firstValueFrom(this.usuarioService.getUsuarios())
      ]);

      // Pilar: Sanitización (No incluirse a uno mismo)
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

  // --- ACCIONES ---
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.filtro.set(input.value);
  }

  toggleUsuario(id: number) {
    this.seleccionados.update(actual =>
      actual.includes(id) ? actual.filter(i => i !== id) : [...actual, id]
    );
  }

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().includes(id);
  }

  async guardar(): Promise<void> {
    // Pilar: Validación de Negocio
    if (!this.nombreGrupo || this.seleccionados().length === 0) return;

    try {
      this.cargando.set(true); // Pilar: Bloqueo de Re-entrada

      const nuevoGrupo: PlantillaUsuario = {
        nombre: this.nombreGrupo,
        usuarios: this.seleccionados().map(id => ({ id }))
      };

      await firstValueFrom(this.plantillaUsuarioService.create(nuevoGrupo));
      void this.router.navigate(['/dashboard/difusion/administrar-grupos']);
    } catch (error) {
      console.error("Error al crear grupo:", error);
    } finally {
      this.cargando.set(false);
    }
  }
}
