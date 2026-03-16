import {Component, inject, OnInit, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {RouterLink} from '@angular/router';

import {PlantillaMonitoreoService} from '../../services/plantilla-monitoreo.service';
import {UsuarioService} from '../../services/usuario.service';
import {MonitoreoService} from '../../services/monitoreo.service';
import {PlantillaUsuarioService} from '../../services/plantilla-usuario.service';

import {UsuarioDTO, MonitoreoListadoDTO} from '../../models/monitoreo.model';
import {PlantillaMonitoreo} from '../../models/plantilla-monitoreo';
import {PlantillaUsuario} from '../../models/plantilla-usuario';

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

  // --- ESTADOS UI ---
  accion = signal<'ASIGNAR' | 'REVOCAR'>('ASIGNAR');
  esModoGrupo = signal(false);
  esModoMonitoreoUnico = signal(false);
  cargando = signal(false);

  // --- DATOS ---
  plantillas = signal<PlantillaMonitoreo[]>([]);
  plantillasUsuario = signal<PlantillaUsuario[]>([]);
  usuariosSistema = signal<UsuarioDTO[]>([]);
  misMonitoreos = signal<MonitoreoListadoDTO[]>([]);
  miPerfilLogueado = signal<UsuarioDTO | null>(null);

  // --- SELECCIONES ---
  idPlantillaSeleccionada = signal<number | null>(null);
  idMonitoreoUnicoSeleccionado = signal<number | null>(null);
  idPlantillaUsuarioSeleccionada = signal<number | null>(null);
  emailUsuarioDestino = signal<string | null>(null);

  // --- COMPUTED ---
  plantillaElegida = computed(() =>
    this.plantillas().find(p => p.id === Number(this.idPlantillaSeleccionada()))
  );

  monitoreoElegido = computed(() =>
    this.misMonitoreos().find(m => m.id === Number(this.idMonitoreoUnicoSeleccionado()))
  );

  plantillaUsuarioElegida = computed(() =>
    this.plantillasUsuario().find(p => p.id === Number(this.idPlantillaUsuarioSeleccionada()))
  );

  usuariosFiltrados = computed(() => {
    const emailPropio = this.miPerfilLogueado()?.email;
    return this.usuariosSistema().filter(u => u.email !== emailPropio);
  });

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);
      const miPerfil = await firstValueFrom(this.usuarioService.getPerfil());

      // VALIDACIÓN Y MAPEADO: Convertimos miPerfil a UsuarioDTO
      // para que el Signal no se queje del 'id'
      if (miPerfil.id === undefined) {
        throw new Error("ID no encontrado");
      }

      this.miPerfilLogueado.set({
        id: miPerfil.id,
        nombre: miPerfil.nombre,
        email: miPerfil.email,
        permiso: miPerfil.permiso || 'USUARIO'
      });

      // Ahora miId es garantizadamente un number
      const miId = miPerfil.id;

      const [pMon, pUsu, users, mons] = await Promise.all([
        firstValueFrom(this.plantillaService.findByPropietario(miId)),
        firstValueFrom(this.plantillaUsuarioService.findAll()),
        firstValueFrom(this.usuarioService.getUsuarios()),
        firstValueFrom(this.monitoreoService.getMisMonitoreos())
      ]);

      this.plantillas.set(pMon);
      this.plantillasUsuario.set(pUsu);
      this.misMonitoreos.set(mons);

      // Mapeamos el resto de usuarios del sistema
      this.usuariosSistema.set(users.map(u => ({
        id: u.id ?? 0,
        nombre: u.nombre,
        email: u.email,
        permiso: u.permiso || 'USUARIO'
      })));

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      this.cargando.set(false);
    }
  }

  // --- CAMBIOS DE MODO ---

  alternarModoGrupo() {
    this.esModoGrupo.update(v => !v);
    this.emailUsuarioDestino.set(null);
    this.idPlantillaUsuarioSeleccionada.set(null);
  }

  alternarModoMonitoreo() {
    this.esModoMonitoreoUnico.update(v => !v);
    this.idPlantillaSeleccionada.set(null);
    this.idMonitoreoUnicoSeleccionado.set(null);
  }

  setAccion(tipo: 'ASIGNAR' | 'REVOCAR') {
    this.accion.set(tipo);
  }

  // --- LÓGICA PRINCIPAL ---

  async ejecutarDifusion() {
    try {
      this.cargando.set(true);
      const miPerfil = await firstValueFrom(this.usuarioService.getPerfil());

      // 1. DETERMINAR EMAILS DESTINO
      let emailsDestino: string[] = [];
      if (this.esModoGrupo()) {
        const grupo = this.plantillaUsuarioElegida();
        emailsDestino = grupo?.usuarios?.map(u => u.email).filter((e): e is string => !!e) ?? [];
      } else {
        const emailIndividual = this.emailUsuarioDestino();
        if (emailIndividual) {
          emailsDestino = [emailIndividual];
        }
      }

      // SEGURIDAD: Filtrar para que el usuario no se invite a sí mismo
      const emailsFiltrados = emailsDestino.filter(email => email !== miPerfil.email);

      if (emailsDestino.length > 0 && emailsFiltrados.length === 0) {
        alert("No puedes realizar esta acción sobre tu propio usuario.");
        return;
      }

      if (emailsFiltrados.length === 0) {
        alert("No hay destinatarios válidos.");
        return;
      }

      // 2. DETERMINAR MONITOREOS AFECTADOS
      let idsMonitoreos: number[] = [];

      if (this.esModoMonitoreoUnico()) {
        const idUnico = this.idMonitoreoUnicoSeleccionado();
        if (idUnico) idsMonitoreos = [idUnico];
      } else {
        const plantilla = this.plantillaElegida();
        // Mapeamos los IDs de la plantilla (ya sabemos que son del usuario)
        idsMonitoreos = plantilla?.monitoreos
          ?.map(m => m.id)
          .filter((id): id is number => id !== undefined) ?? [];
      }

      if (!idsMonitoreos.length) {
        alert("La selección no contiene monitoreos válidos.");
        return;
      }

      // 3. EJECUCIÓN (Usamos allSettled para que no se detenga si uno ya existe/no existe)
      const promesas = emailsFiltrados.flatMap(email =>
        idsMonitoreos.map(idMon =>
          this.accion() === 'ASIGNAR'
            ? firstValueFrom(this.monitoreoService.invitarUsuario(idMon, email))
            : firstValueFrom(this.monitoreoService.quitarInvitado(idMon, email))
        )
      );

      await Promise.allSettled(promesas);

      alert(`${this.accion() === 'ASIGNAR' ? 'Proceso de asignación' : 'Proceso de revocación'} finalizado.`);
      this.limpiarSeleccion();

    } catch (error) {
      console.error("Error crítico en la difusión:", error);
      alert("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      this.cargando.set(false);
    }
  }

  private limpiarSeleccion() {
    this.idPlantillaSeleccionada.set(null);
    this.idMonitoreoUnicoSeleccionado.set(null);
    this.idPlantillaUsuarioSeleccionada.set(null);
    this.emailUsuarioDestino.set(null);
  }

}
