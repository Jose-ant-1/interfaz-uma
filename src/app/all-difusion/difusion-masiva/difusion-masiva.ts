import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlantillaMonitoreoService } from '../../services/plantilla-monitoreo.service';
import { UsuarioService } from '../../services/usuario.service';
import { MonitoreoService } from '../../services/monitoreo.service';
import { PlantillaUsuarioService } from '../../services/plantilla-usuario.service';
import { UsuarioDTO } from '../../models/monitoreo.model';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-difusion-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './difusion-masiva.html',
  styleUrls: ['./difusion-masiva.css']
})
export class DifusionMasiva implements OnInit {
  private readonly plantillaService = inject(PlantillaMonitoreoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly monitoreoService = inject(MonitoreoService);
  private readonly plantillaUsuarioService = inject(PlantillaUsuarioService);

  // Estados
  esModoGrupo = signal(false);
  cargando = signal(false);

  // Datos
  plantillas = signal<any[]>([]);
  usuarios = signal<UsuarioDTO[]>([]);
  plantillasUsuario = signal<any[]>([]);

  // Selecciones
  idPlantillaSeleccionada = signal<number | null>(null);
  emailUsuarioDestino = signal<string>('');
  idPlantillaUsuarioSeleccionada = signal<number | null>(null);

  plantillaElegida = computed(() => {
    return this.plantillas().find(p => p.id === Number(this.idPlantillaSeleccionada()));
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      const perfil = await firstValueFrom(this.monitoreoService.getPerfil());

      // Cargamos todo en paralelo para ser más rápidos
      const [pMon, uInd, pUsu] = await Promise.all([
        firstValueFrom(this.plantillaService.findByPropietario(perfil.id)),
        firstValueFrom(this.usuarioService.getUsuarios()),
        firstValueFrom(this.plantillaUsuarioService.findAll())
      ]);

      this.plantillas.set(pMon);
      // CORRECCIÓN DEL ERROR DE TIPOS: Forzamos el tipo para que TS no se queje
      this.usuarios.set(uInd as unknown as UsuarioDTO[]);
      this.plantillasUsuario.set(pUsu);
    } catch (err) {
      console.error("Error cargando datos:", err);
    }
  }

  alternarModoGrupo() {
    this.esModoGrupo.set(!this.esModoGrupo());
    this.emailUsuarioDestino.set('');
    this.idPlantillaUsuarioSeleccionada.set(null);
  }

  async ejecutarDifusion() {
    const idPlantillaMon = this.idPlantillaSeleccionada();
    if (!idPlantillaMon) return;

    // 1. Obtenemos tu perfil para saber quién eres
    const miPerfil = await firstValueFrom(this.monitoreoService.getPerfil());
    this.cargando.set(true);

    try {
      if (this.esModoGrupo()) {
        const idGrupo = this.idPlantillaUsuarioSeleccionada();
        const grupo = this.plantillasUsuario().find(g => g.id === Number(idGrupo));

        if (grupo?.usuarios) {
          for (const u of grupo.usuarios) {
            // 2. VALIDACIÓN CLAVE: Si el usuario del grupo soy yo, me salto este paso
            if (u.email === miPerfil.email) {
              console.warn("Saltando difusión para: ", u.email, "(eres tú mismo)");
              continue;
            }
            await firstValueFrom(this.plantillaService.aplicarPlantillaAUsuario(idPlantillaMon, u.email));
          }
          alert(`Difusión completada (se han omitido autorreferencias si las hubiera).`);
        }
      } else {
        const email = this.emailUsuarioDestino();
        if (!email) return;

        // Validación modo único
        if (email === miPerfil.email) {
          alert("No puedes aplicarte una plantilla a ti mismo");
          this.cargando.set(false);
          return;
        }

        await firstValueFrom(this.plantillaService.aplicarPlantillaAUsuario(idPlantillaMon, email));
        alert("¡Acceso concedido!");
      }
      this.limpiarSeleccion();
    } catch (error) {
      alert("Error durante la difusión");
    } finally {
      this.cargando.set(false);
    }
  }

  private limpiarSeleccion() {
    this.idPlantillaSeleccionada.set(null);
    this.emailUsuarioDestino.set('');
    this.idPlantillaUsuarioSeleccionada.set(null);
  }
}
