import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlantillaMonitoreoService } from '../services/plantilla-monitoreo.service';
import { UsuarioService } from '../services/usuario.service';
import { MonitoreoService } from '../services/monitoreo.service';
import { Usuario } from '../models/usuario.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-difusion-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './difusion-masiva.html',
  styleUrls: ['./difusion-masiva.css']
})
export class DifusionMasiva implements OnInit {
  // Inyecciones modernas
  private readonly plantillaService = inject(PlantillaMonitoreoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly monitoreoService = inject(MonitoreoService);

  // Estados con Signals
  plantillas = signal<any[]>([]);
  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);

  // Campos del formulario (Signals para enlace bidireccional si prefieres,
  // o variables normales para usar con ngModel)
  idPlantillaSeleccionada = signal<number | null>(null);
  emailUsuarioDestino = signal<string>('');

  plantillaElegida = computed(() => {
    const id = this.idPlantillaSeleccionada();
    if (!id) return null;
    return this.plantillas().find(p => p.id == id) || null;
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      // Usamos firstValueFrom para manejarlo de forma asíncrona limpia
      const perfil = await firstValueFrom(this.monitoreoService.getPerfil());
      const p = await firstValueFrom(this.plantillaService.findByPropietario(perfil.id));
      this.plantillas.set(p);

      const u = await firstValueFrom(this.usuarioService.getUsuarios());
      this.usuarios.set(u);
    } catch (err) {
      console.error("Error cargando datos para difusión masiva:", err);
    }
  }

  async ejecutarDifusion() {
    const idPlantilla = this.idPlantillaSeleccionada();
    const email = this.emailUsuarioDestino();

    if (!idPlantilla || !email) return;

    if (confirm(`¿Invitar a ${email} a todos los monitoreos de la plantilla?`)) {
      this.cargando.set(true);

      this.plantillaService.aplicarPlantillaAUsuario(idPlantilla, email).subscribe({
        next: () => {
          this.cargando.set(false);
          alert("¡Acceso masivo concedido!");
          this.idPlantillaSeleccionada.set(null);
          this.emailUsuarioDestino.set('');
        },
        error: (err) => {
          this.cargando.set(false);
          alert("Error en el servidor al procesar la difusión.");
        }
      });
    }
  }
}
