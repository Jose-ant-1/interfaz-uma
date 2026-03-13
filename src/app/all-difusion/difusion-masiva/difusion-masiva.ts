import {Component, inject, OnInit, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {PlantillaMonitoreoService} from '../../services/plantilla-monitoreo.service';
import {UsuarioService} from '../../services/usuario.service';
import {MonitoreoService} from '../../services/monitoreo.service';
import {PlantillaUsuarioService} from '../../services/plantilla-usuario.service';
import {UsuarioDTO, MonitoreoListadoDTO} from '../../models/monitoreo.model';
import {firstValueFrom} from 'rxjs';
import {RouterLink} from '@angular/router';

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

  // --- ESTADOS DE MODO ---
  esModoGrupo = signal(false); // False = Usuario Único | True = Grupo de Usuarios
  esModoMonitoreoUnico = signal(false); // False = Plantilla de Monitoreos | True = Monitoreo Único
  cargando = signal(false);

  // --- DATOS DISPONIBLES ---
  plantillas = signal<any[]>([]);
  usuarios = signal<UsuarioDTO[]>([]);
  plantillasUsuario = signal<any[]>([]);
  monitoreosDisponibles = signal<MonitoreoListadoDTO[]>([]);

  // --- SELECCIONES DEL USUARIO ---
  idPlantillaSeleccionada = signal<number | null>(null);
  idMonitoreoUnicoSeleccionado = signal<number | null>(null);
  emailUsuarioDestino = signal<string>('');
  idPlantillaUsuarioSeleccionada = signal<number | null>(null);

  // --- HELPERS VISUALES (Computed) ---
  plantillaElegida = computed(() => {
    return this.plantillas().find(p => p.id === Number(this.idPlantillaSeleccionada()));
  });

  monitoreoElegido = computed(() => {
    return this.monitoreosDisponibles().find(m => m.id === Number(this.idMonitoreoUnicoSeleccionado()));
  });

  miPerfil = signal<any>(null);

  usuariosFiltrados = computed(() => {
    const perfilActual = this.miPerfil();
    const listaUsuarios = this.usuarios();

    if (!perfilActual) return listaUsuarios;

    // Retornamos todos menos el que coincida con el email del logueado
    return listaUsuarios.filter(u => u.email !== perfilActual.email);
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      // 1. Cargamos el perfil actual y lo guardamos en la señal
      const perfil = await firstValueFrom(this.usuarioService.getPerfil());
      this.miPerfil.set(perfil);

      // 2. Cargamos el resto de los datos en paralelo para mayor rapidez
      const [pMon, users, pUsu, misMon] = await Promise.all([
        firstValueFrom(this.plantillaService.findByPropietario(perfil.id!)), // Filtra las plantillas de las que eres dueño
        firstValueFrom(this.usuarioService.getUsuarios()),
        firstValueFrom(this.plantillaUsuarioService.findAll()),
        firstValueFrom(this.monitoreoService.getMisMonitoreos()) // Obtenemos las páginas individuales
      ]);

      this.plantillas.set(pMon);
      // Solucionamos el TS2345 usando un cast, ya que las propiedades básicas coinciden
      this.usuarios.set(users as unknown as UsuarioDTO[]);
      this.plantillasUsuario.set(pUsu);
      this.monitoreosDisponibles.set(misMon); // Corrección: Antes tenías this.misMonitoreos

    } catch (err) {
      console.error("Error cargando datos:", err);
    }
  }

  // --- ALTERNADORES DE MODOS ---
  alternarModoGrupo() {
    this.esModoGrupo.set(!this.esModoGrupo());
    this.emailUsuarioDestino.set('');
    this.idPlantillaUsuarioSeleccionada.set(null);
  }

  alternarModoMonitoreo() {
    this.esModoMonitoreoUnico.set(!this.esModoMonitoreoUnico());
    this.idPlantillaSeleccionada.set(null);
    this.idMonitoreoUnicoSeleccionado.set(null);
  }

  // --- LÓGICA DE EJECUCIÓN ---
  async ejecutarDifusion() {
    const idPlantillaMon = this.idPlantillaSeleccionada();
    const idMonitoreoUnico = this.idMonitoreoUnicoSeleccionado();

    // 1. Validar que al menos se haya seleccionado el origen correcto
    if (!this.esModoMonitoreoUnico() && !idPlantillaMon) return;
    if (this.esModoMonitoreoUnico() && !idMonitoreoUnico) return;

    this.cargando.set(true);

    try {
      const miPerfil = this.miPerfil(); // Usamos el que ya tenemos guardado en memoria
      let emailsDestino: string[] = [];

      // 2. RECOPILAR EMAILS DESTINO SEGÚN EL MODO (Grupo o Individual)
      if (this.esModoGrupo()) {
        const idGrupo = this.idPlantillaUsuarioSeleccionada();
        const grupo = this.plantillasUsuario().find(g => g.id === Number(idGrupo));

        if (grupo?.usuarios) {
          emailsDestino = grupo.usuarios
            .map((u: any) => u.email)
            .filter((email: string) => {
              if (email === miPerfil.email) {
                console.warn("Saltando difusión para:", email, "(eres tú mismo)");
                return false;
              }
              return true;
            });
        }
      } else {
        const email = this.emailUsuarioDestino();
        if (email) {
          if (email === miPerfil.email) {
            alert("No puedes aplicarte difusiones a ti mismo");
            this.cargando.set(false);
            return;
          }
          emailsDestino.push(email);
        }
      }

      // 3. VALIDACIÓN DE EMAILS RECOPILADOS
      if (emailsDestino.length === 0) {
        alert("No hay usuarios válidos seleccionados para aplicar la difusión.");
        this.cargando.set(false);
        return;
      }

      // 4. EJECUTAR LAS PETICIONES AL BACKEND
      for (const email of emailsDestino) {
        if (this.esModoMonitoreoUnico()) {
          // Llama al servicio de Monitoreo para invitar individualmente
          await firstValueFrom(this.monitoreoService.invitarUsuario(idMonitoreoUnico!, email));
        } else {
          // Llama al servicio de Plantillas para aplicar todo el bloque
          await firstValueFrom(this.plantillaService.aplicarPlantillaAUsuario(idPlantillaMon!, email));
        }
      }

      alert("¡Difusión completada con éxito!");
      this.limpiarSeleccion();
    } catch (error) {
      console.error("Error en la ejecución:", error);
      alert("Ocurrió un error durante la difusión. Revisa la consola.");
    } finally {
      this.cargando.set(false);
    }
  }

  private limpiarSeleccion() {
    this.idPlantillaSeleccionada.set(null);
    this.idMonitoreoUnicoSeleccionado.set(null);
    this.emailUsuarioDestino.set('');
    this.idPlantillaUsuarioSeleccionada.set(null);
  }
}
