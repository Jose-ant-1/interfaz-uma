import { TestBed } from '@angular/core/testing';
import { DifusionMasiva } from './difusion-masiva';
import { PlantillaMonitoreoService } from '../../services/plantilla-monitoreo.service';
import { UsuarioService } from '../../services/usuario.service';
import { MonitoreoService } from '../../services/monitoreo.service';
import { PlantillaUsuarioService } from '../../services/plantilla-usuario.service';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {of, throwError} from 'rxjs';

describe('DifusionMasivaComponent', () => { // <--- Describe Principal (Contenedor Raíz)
  let component: DifusionMasiva;

  const mockPlantillaService = {
    findByPropietario: vi.fn()
  };
  const mockUsuarioService = {
    getPerfil: vi.fn(),
    getUsuarios: vi.fn()
  };
  const mockMonitoreoService = {
    getMisMonitoreos: vi.fn(),
    invitacionEnMasa: vi.fn(),
    quitarEnMasa: vi.fn()
  };
  const mockPlantillaUsuarioService = {
    findAll: vi.fn()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlantillaMonitoreoService, useValue: mockPlantillaService },
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: PlantillaUsuarioService, useValue: mockPlantillaUsuarioService }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    runInInjectionContext(injector, () => {
      component = new DifusionMasiva();
    });

    vi.clearAllMocks();
  });

  describe('1. Infraestructura y Contrato de Inyección', () => {

    it('1. debería inyectar correctamente los 4 servicios necesarios', () => {
      expect(component['plantillaService']).toBeDefined();
      expect(component['usuarioService']).toBeDefined();
      expect(component['monitoreoService']).toBeDefined();
      expect(component['plantillaUsuarioService']).toBeDefined();
    });

    it('2. (Pilar Estabilidad) los signals de UI deben tener el estado inicial definido', () => {
      expect(component.accion()).toBe('ASIGNAR');
      expect(component.esModoGrupo()).toBe(false);
      expect(component.esModoMonitoreoUnico()).toBe(false);
      expect(component.cargando()).toBe(false);
    });

    it('3. (Pilar Integridad) las colecciones de datos deben iniciar vacías', () => {
      expect(component.plantillas()).toEqual([]);
      expect(component.usuariosSistema()).toEqual([]);
      expect(component.misMonitoreos()).toEqual([]);
      expect(component.plantillasUsuario()).toEqual([]);
    });

    it('4. (Pilar Resiliencia) las selecciones deben ser null para evitar acciones accidentales', () => {
      expect(component.idPlantillaSeleccionada()).toBeNull();
      expect(component.idMonitoreoUnicoSeleccionado()).toBeNull();
      expect(component.emailUsuarioDestino()).toBeNull();
      expect(component.miPerfilLogueado()).toBeNull();
    });

    it('5. (Pilar Contrato) los métodos principales de la lógica deben estar definidos', () => {
      expect(typeof component.cargarDatos).toBe('function');
      expect(typeof component.ejecutarDifusion).toBe('function');
    });
  });

  describe('2. Gestión de Estados y Lógica Reactiva (Signals & Computed)', () => {

    describe('Signals de Selección y Modos', () => {
      it('1. (Pilar Estabilidad) alternarModoGrupo debe resetear selecciones dependientes', () => {
        // Simulamos un estado previo con selecciones
        component.emailUsuarioDestino.set('test@test.com');
        component.idPlantillaUsuarioSeleccionada.set(5);

        component.alternarModoGrupo();

        expect(component.esModoGrupo()).toBe(true);
        expect(component.emailUsuarioDestino()).toBeNull(); // Reset
        expect(component.idPlantillaUsuarioSeleccionada()).toBeNull(); // Reset
      });

      it('2. (Pilar Estabilidad) alternarModoMonitoreo debe resetear selecciones de monitoreo', () => {
        component.idPlantillaSeleccionada.set(10);
        component.idMonitoreoUnicoSeleccionado.set(20);

        component.alternarModoMonitoreo();

        expect(component.esModoMonitoreoUnico()).toBe(true);
        expect(component.idPlantillaSeleccionada()).toBeNull(); // Reset
        expect(component.idMonitoreoUnicoSeleccionado()).toBeNull(); // Reset
      });

      it('3. setAccion debe actualizar el tipo de operación (ASIGNAR/REVOCAR)', () => {
        component.setAccion('REVOCAR');
        expect(component.accion()).toBe('REVOCAR');
      });
    });

    describe('Computed Signals (Lógica Derivada)', () => {
      beforeEach(() => {
        // Datos de prueba corregidos con el campo 'permiso'
        component.plantillas.set([{ id: 1, nombre: 'Plantilla A', monitoreos: [] }]);
        component.misMonitoreos.set([{ id: 100, nombre: 'Server 1', paginaUrl: 'test.com' } as any]);

        // Aquí añadimos 'permiso' para cumplir con UsuarioDTO
        component.usuariosSistema.set([
          { id: 1, nombre: 'Admin', email: 'admin@uma.es', permiso: 'ADMIN' },
          { id: 2, nombre: 'User', email: 'user@uma.es', permiso: 'USUARIO' }
        ]);

        // También corregimos el perfil logueado
        component.miPerfilLogueado.set({
          id: 1,
          nombre: 'Admin',
          email: 'admin@uma.es',
          permiso: 'ADMIN'
        });
      });

      it('4. (Pilar Integridad) plantillaElegida debe reaccionar al cambio de idPlantillaSeleccionada', () => {
        component.idPlantillaSeleccionada.set(1);
        expect(component.plantillaElegida()?.nombre).toBe('Plantilla A');
      });

      it('5. (Pilar Integridad) monitoreoElegido debe reaccionar al cambio de idMonitoreoUnicoSeleccionado', () => {
        component.idMonitoreoUnicoSeleccionado.set(100);
        expect(component.monitoreoElegido()?.nombre).toBe('Server 1');
      });

      it('6. (Pilar Resiliencia) usuariosFiltrados NO debe incluir al usuario logueado', () => {
        const filtrados = component.usuariosFiltrados();
        // El admin está logueado, no debería aparecer en la lista para evitar auto-difusión
        expect(filtrados.find(u => u.email === 'admin@uma.es')).toBeUndefined();
        expect(filtrados.length).toBe(1);
        expect(filtrados[0].email).toBe('user@uma.es');
      });

      it('7. (Pilar Tipado) los computed deben manejar correctamente IDs pasados como string desde el HTML', () => {
        // El HTML suele devolver strings desde los <select>
        component.idPlantillaSeleccionada.set('1' as any);
        expect(component.plantillaElegida()).toBeDefined();
        expect(component.plantillaElegida()?.id).toBe(1);
      });
    });
  });

  describe('3. Ciclo de Vida y Carga de Datos (ngOnInit)', () => {

    // Definimos datos de prueba completos para cumplir con los DTOs
    const mockPerfil = { id: 1, nombre: 'Admin', email: 'admin@uma.es', permiso: 'ADMIN' };
    const mockPlantillas = [{ id: 1, nombre: 'P1', monitoreos: [] }];
    const mockUsuarios = [{ id: 2, nombre: 'User', email: 'user@uma.es', permiso: 'USUARIO' }];
    const mockMonitoreos = [{ id: 100, nombre: 'M1', paginaUrl: 'test.com' }];

    beforeEach(() => {
      // Configuramos los mocks para que devuelvan éxito por defecto
      mockUsuarioService.getPerfil.mockReturnValue(of(mockPerfil));
      mockPlantillaService.findByPropietario.mockReturnValue(of(mockPlantillas));
      mockPlantillaUsuarioService.findAll.mockReturnValue(of([]));
      mockUsuarioService.getUsuarios.mockReturnValue(of(mockUsuarios));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockMonitoreos));
    });

    it('1. (Pilar Integridad) debería cargar y distribuir todos los datos en los signals correspondientes', async () => {
      await component.cargarDatos();

      expect(component.miPerfilLogueado()).toEqual(mockPerfil);
      expect(component.plantillas()).toEqual(mockPlantillas);
      expect(component.usuariosSistema().length).toBe(1);
      expect(component.misMonitoreos()).toEqual(mockMonitoreos);
      expect(component.cargando()).toBe(false);
    });

    it('2. (Pilar Resiliencia) debería manejar el error si el perfil no tiene ID', async () => {
      // Simulamos un perfil corrupto (sin ID)
      mockUsuarioService.getPerfil.mockReturnValue(of({ nombre: 'Error', email: 'e@e.com' }));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.cargarDatos();

      expect(consoleSpy).toHaveBeenCalledWith("Error cargando datos:", expect.any(Error));
      expect(component.cargando()).toBe(false);
    });

    it('3. (Pilar Resiliencia) si una de las promesas del Promise.all falla, debe capturar el error globalmente', async () => {
      const errorMsg = 'Fallo de red en plantillas';
      mockPlantillaService.findByPropietario.mockReturnValue(throwError(() => new Error(errorMsg)));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.cargarDatos();

      expect(consoleSpy).toHaveBeenCalledWith("Error cargando datos:", expect.any(Error));
      // Verificamos que el estado de carga se apaga a pesar del error
      expect(component.cargando()).toBe(false);
    });

    it('4. (Pilar Estabilidad) el estado "cargando" debe ser true durante la ejecución y false al terminar', async () => {
      // Creamos una promesa controlada para verificar el estado intermedio
      let resolver: any;
      const promesaLenta = new Promise(res => { resolver = res; });
      mockUsuarioService.getPerfil.mockReturnValue(of(mockPerfil));
      mockPlantillaService.findByPropietario.mockReturnValue(promesaLenta as any);

      const ejecucion = component.cargarDatos();
      expect(component.cargando()).toBe(true);

      resolver(mockPlantillas);
      await ejecucion;
      expect(component.cargando()).toBe(false);
    });

    it('5. (Pilar Cohesión) ngOnInit debe invocar automáticamente a cargarDatos', () => {
      const spy = vi.spyOn(component, 'cargarDatos');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('4. Acción Principal: ejecutarDifusion()', () => {

    beforeEach(() => {
      vi.clearAllMocks();
      // Setup de alertas y confirmaciones
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Datos mínimos para que los computed no fallen
      component.miPerfilLogueado.set({ id: 1, email: 'admin@uma.es', nombre: 'Admin', permiso: 'ADMIN' });
    });

    it('1. (Pilar Resiliencia) debería abortar y mostrar alerta si no hay usuarios seleccionados', async () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.esModoGrupo.set(false);
      component.emailUsuarioDestino.set(null); // Nada seleccionado

      await component.ejecutarDifusion();

      expect(alertSpy).toHaveBeenCalledWith("No hay usuarios válidos seleccionados.");
      expect(mockMonitoreoService.invitacionEnMasa).not.toHaveBeenCalled();
    });

    it('2. (Pilar Resiliencia) debería abortar si la plantilla seleccionada no tiene monitoreos', async () => {
      const alertSpy = vi.spyOn(window, 'alert');
      // Modo plantilla pero con plantilla vacía
      component.esModoMonitoreoUnico.set(false);
      component.plantillas.set([{ id: 1, nombre: 'Vacía', monitoreos: [] }]);
      component.idPlantillaSeleccionada.set(1);
      component.emailUsuarioDestino.set('test@uma.es');

      await component.ejecutarDifusion();

      expect(alertSpy).toHaveBeenCalledWith("La selección no contiene monitoreos válidos.");
    });

    it('3. (Pilar Comunicación) debería llamar a invitacionEnMasa en modo ASIGNAR', async () => {
      // Configuración de éxito
      component.accion.set('ASIGNAR');
      component.esModoMonitoreoUnico.set(true);
      component.idMonitoreoUnicoSeleccionado.set(100);
      component.emailUsuarioDestino.set('user@uma.es');
      mockMonitoreoService.invitacionEnMasa.mockReturnValue(of({}));

      await component.ejecutarDifusion();

      expect(mockMonitoreoService.invitacionEnMasa).toHaveBeenCalledWith([100], ['user@uma.es']);
    });

    it('4. (Pilar Comunicación) debería llamar a quitarEnMasa en modo REVOCAR', async () => {
      component.accion.set('REVOCAR');
      component.esModoMonitoreoUnico.set(true);
      component.idMonitoreoUnicoSeleccionado.set(100);
      component.emailUsuarioDestino.set('user@uma.es');
      mockMonitoreoService.quitarEnMasa.mockReturnValue(of({}));

      await component.ejecutarDifusion();

      expect(mockMonitoreoService.quitarEnMasa).toHaveBeenCalledWith([100], ['user@uma.es']);
    });

    it('5. (Pilar Integridad) debería limpiar las selecciones tras un éxito', async () => {
      // 1. Preparamos los datos necesarios para que no salte por el "return" de error
      component.plantillas.set([
        { id: 1, nombre: 'Plantilla OK', monitoreos: [{ id: 10 }] } as any
      ]);

      // 2. Seteamos las selecciones
      component.idPlantillaSeleccionada.set(1);
      component.emailUsuarioDestino.set('user@uma.es');

      // 3. Mockeamos el servicio para que responda éxito
      mockMonitoreoService.invitacionEnMasa.mockReturnValue(of({}));

      // 4. Ejecutamos
      await component.ejecutarDifusion();

      // 5. Ahora sí, el flujo llega al final y limpia
      expect(component.idPlantillaSeleccionada()).toBeNull();
      expect(component.emailUsuarioDestino()).toBeNull();
    });

    it('6. (Pilar Resiliencia) debería manejar errores del servidor y mostrar alerta de error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // 1. IMPORTANTE: Configurar el perfil logueado para que el filtro de usuarios no de vacío
      component.miPerfilLogueado.set({
        id: 1,
        email: 'admin@uma.es',
        nombre: 'Admin',
        permiso: 'ADMIN'
      });

      // 2. Seteamos un usuario destino que NO sea el logueado
      component.emailUsuarioDestino.set('otro-usuario@uma.es');

      // 3. Seteamos un monitoreo válido
      component.esModoMonitoreoUnico.set(true);
      component.idMonitoreoUnicoSeleccionado.set(100);

      // 4. Simulamos el fallo del servidor
      mockMonitoreoService.invitacionEnMasa.mockReturnValue(throwError(() => new Error('API Error')));

      await component.ejecutarDifusion();

      // Ahora sí debería llegar al catch
      expect(consoleSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith("Ocurrió un error al procesar la solicitud masiva.");
      expect(component.cargando()).toBe(false);

      consoleSpy.mockRestore();
    });

    it('7. (Pilar Cohesión) debería extraer correctamente los emails de una plantilla de usuarios (Modo Grupo)', async () => {
      component.esModoGrupo.set(true);
      component.plantillasUsuario.set([{
        id: 5,
        nombre: 'Grupo Test',
        usuarios: [{ email: 'u1@uma.es' }, { email: 'u2@uma.es' }]
      } as any]);
      component.idPlantillaUsuarioSeleccionada.set(5);

      // Modo monitoreo único para simplificar
      component.esModoMonitoreoUnico.set(true);
      component.idMonitoreoUnicoSeleccionado.set(100);

      mockMonitoreoService.invitacionEnMasa.mockReturnValue(of({}));

      await component.ejecutarDifusion();

      expect(mockMonitoreoService.invitacionEnMasa).toHaveBeenCalledWith(
        [100],
        ['u1@uma.es', 'u2@uma.es']
      );
    });
  });

  describe('5. Métodos de Interfaz y Cambio de Estado', () => {

    it('debería resetear todas las selecciones al llamar a limpiarSeleccion', () => {
      // 1. Llenamos los signals con basura
      component.idPlantillaSeleccionada.set(1);
      component.idMonitoreoUnicoSeleccionado.set(100);
      component.idPlantillaUsuarioSeleccionada.set(5);
      component.emailUsuarioDestino.set('test@uma.es');

      // 2. Limpiamos
      component.limpiarSeleccion();

      // 3. Verificamos el Pilar de Integridad
      expect(component.idPlantillaSeleccionada()).toBeNull();
      expect(component.idMonitoreoUnicoSeleccionado()).toBeNull();
      expect(component.idPlantillaUsuarioSeleccionada()).toBeNull();
      expect(component.emailUsuarioDestino()).toBeNull();
    });

    it('debería alternar correctamente el modo de grupo y limpiar dependencias', () => {
      component.emailUsuarioDestino.set('usuario@uma.es');

      component.alternarModoGrupo(); // Pasa a true
      expect(component.esModoGrupo()).toBe(true);
      expect(component.emailUsuarioDestino()).toBeNull();

      component.alternarModoGrupo(); // Pasa a false
      expect(component.esModoGrupo()).toBe(false);
    });

    it('debería alternar correctamente el modo monitoreo único y limpiar dependencias', () => {
      component.idPlantillaSeleccionada.set(1);

      component.alternarModoMonitoreo(); // Pasa a true
      expect(component.esModoMonitoreoUnico()).toBe(true);
      expect(component.idPlantillaSeleccionada()).toBeNull();
    });

    it('debería cambiar la acción de ASIGNAR a REVOCAR', () => {
      component.setAccion('REVOCAR');
      expect(component.accion()).toBe('REVOCAR');
    });
  });


});
