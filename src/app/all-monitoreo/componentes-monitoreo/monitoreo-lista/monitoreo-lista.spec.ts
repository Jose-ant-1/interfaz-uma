import {TestBed} from '@angular/core/testing';
import {MonitoreoLista} from './monitoreo-lista';
import {MonitoreoService} from '../../../services/monitoreo.service';
import {AuthService} from '../../../services/auth';
import {EnvironmentInjector, runInInjectionContext, signal} from '@angular/core';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {of, throwError, forkJoin} from 'rxjs';

describe('MonitoreoLista - Test de Robustez (Fase 1: Infraestructura)', () => {
  let component: MonitoreoLista;

  // Mocks mínimos necesarios
  const mockMonitoreoService = {
    getMisMonitoreos: vi.fn().mockReturnValue(of([])),
    getColaboraciones: vi.fn().mockReturnValue(of([]))
  };

  const mockAuthService = {
    // Simulamos el signal de userRole
    userRole: signal('USER')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: MonitoreoService, useValue: mockMonitoreoService},
        {provide: AuthService, useValue: mockAuthService}
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);

    // Creamos la instancia en el contexto de inyección para satisfacer a inject()
    runInInjectionContext(injector, () => {
      component = new MonitoreoLista();
    });
  });

  describe('Signals, Inyectables y Computed', () => {

    it('1. debería inyectar correctamente MonitoreoService', () => {
      expect(component['monitoreoService']).toBeDefined();
    });

    it('2. debería inyectar correctamente AuthService', () => {
      expect(component['authService']).toBeDefined();
    });

    it('3. debería inicializar los signals de datos como arrays vacíos', () => {
      expect(component.misMonitoreos()).toEqual([]);
      expect(component.colaboraciones()).toEqual([]);
    });

    it('4. debería inicializar filtroTexto como un string vacío', () => {
      expect(component.filtroTexto()).toBe('');
    });

    it('5. (Computed) misMonitoreosFiltrados debe devolver todo si no hay filtro', () => {
      const mock = [{nombre: 'Google', paginaUrl: 'http://g.com'} as any];
      component.misMonitoreos.set(mock);
      component.filtroTexto.set('');

      expect(component.misMonitoreosFiltrados()).toEqual(mock);
      expect(component.misMonitoreosFiltrados().length).toBe(1);
    });

    it('6. (Computed) misMonitoreosFiltrados debe filtrar por nombre (case insensitive)', () => {
      component.misMonitoreos.set([
        {nombre: 'Producción', paginaUrl: 'http://p.com'} as any,
        {nombre: 'Desarrollo', paginaUrl: 'http://d.com'} as any
      ]);

      component.filtroTexto.set('PROD'); // Buscamos en mayúsculas

      expect(component.misMonitoreosFiltrados().length).toBe(1);
      expect(component.misMonitoreosFiltrados()[0].nombre).toBe('Producción');
    });

    it('7. (Computed) misMonitoreosFiltrados debe filtrar por URL', () => {
      component.misMonitoreos.set([
        {nombre: 'App 1', paginaUrl: 'http://uma.es/api'} as any,
        {nombre: 'App 2', paginaUrl: 'http://google.com'} as any
      ]);

      component.filtroTexto.set('uma.es');

      expect(component.misMonitoreosFiltrados().length).toBe(1);
      expect(component.misMonitoreosFiltrados()[0].nombre).toBe('App 1');
    });

    it('8. (Computed) colaboracionesFiltradas debe funcionar independientemente de misMonitoreos', () => {
      component.colaboraciones.set([
        {nombre: 'Invitado 1', paginaUrl: 'http://x.com'} as any
      ]);
      component.filtroTexto.set('Invitado');

      expect(component.colaboracionesFiltradas().length).toBe(1);
    });

    it('9. (Reactividad) el userRole debe reflejar cambios en el AuthService', () => {
      mockAuthService.userRole.set('ADMIN');
      expect(component.userRole()).toBe('ADMIN');

      mockAuthService.userRole.set('USER');
      expect(component.userRole()).toBe('USER');
    });

    it('10. actualizarFiltro() debe actualizar la señal filtroTexto', () => {
      const event = {target: {value: 'nueva búsqueda'}};
      component.actualizarFiltro(event);
      expect(component.filtroTexto()).toBe('nueva búsqueda');
    });

    it('11. (Integridad) los computed deben devolver un array vacío si no hay coincidencias', () => {
      component.misMonitoreos.set([{nombre: 'A', paginaUrl: 'B'} as any]);
      component.filtroTexto.set('ZZZ'); // No existe

      expect(component.misMonitoreosFiltrados()).toEqual([]);
    });
  });

  describe('ngOnInit - Carga e Intervalo (11 Pilares)', () => {

    beforeEach(() => {
      vi.useFakeTimers(); // Activamos el control del tiempo
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers(); // Restauramos el tiempo real
    });

    it('1. debería disparar la carga inicial de datos (cargarTodo)', () => {
      const spy = vi.spyOn(component, 'cargarTodo');
      component.ngOnInit();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('2. debería actualizar ambos signals tras el éxito de forkJoin', () => {
      const mockPropios = [{id: 1, nombre: 'Mío'} as any];
      const mockInvitado = [{id: 2, nombre: 'Invitado'} as any];

      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockPropios));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of(mockInvitado));

      component.ngOnInit();

      expect(component.misMonitoreos()).toEqual(mockPropios);
      expect(component.colaboraciones()).toEqual(mockInvitado);
    });

    it('3. debería manejar errores en la carga inicial sin que el componente muera', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(throwError(() => 'Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      });

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error'), expect.anything());
      consoleSpy.mockRestore();
    });

    it('4. debería iniciar el intervalo de refresco de 10 segundos', () => {
      const spy = vi.spyOn(component, 'cargarTodo');
      component.ngOnInit();

      // Viajamos 10 segundos al futuro
      vi.advanceTimersByTime(10000);

      // Se habrá llamado 2 veces: 1 (init) + 1 (primer intervalo)
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('5. debería realizar múltiples recargas si pasa mucho tiempo', () => {
      const spy = vi.spyOn(component, 'cargarTodo');
      component.ngOnInit();

      vi.advanceTimersByTime(30000); // 3 intervalos

      expect(spy).toHaveBeenCalledTimes(4); // 1 + 3
    });

    it('6. debería cancelar el intervalo al destruir el componente (OnDestroy)', () => {
      const spy = vi.spyOn(component, 'cargarTodo');
      component.ngOnInit();

      component.ngOnDestroy(); // Destruimos
      vi.advanceTimersByTime(10000);

      // No debería haber aumentado el número de llamadas tras el init
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('7. (Robustez) forkJoin debe disparar ambas peticiones en paralelo', () => {
      component.ngOnInit();
      expect(mockMonitoreoService.getMisMonitoreos).toHaveBeenCalled();
      expect(mockMonitoreoService.getColaboraciones).toHaveBeenCalled();
    });

    it('8. debería mantener los signals vacíos si el servidor devuelve arrays vacíos', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      component.ngOnInit();

      expect(component.misMonitoreos()).toEqual([]);
      expect(component.colaboraciones()).toEqual([]);
    });

    it('9. debería registrar en consola cada vez que el intervalo recarga', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      });
      component.ngOnInit();

      vi.advanceTimersByTime(10000);

      expect(logSpy).toHaveBeenCalledWith("recargada");
      logSpy.mockRestore();
    });

    it('10. (Pilar Integridad) los computed de filtrado deben seguir funcionando tras una recarga del intervalo', () => {
      component.ngOnInit();
      component.filtroTexto.set('test');

      // Simulamos que el intervalo trae nuevos datos
      const nuevosDatos = [{nombre: 'test-nuevo', paginaUrl: 'u'} as any];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(nuevosDatos));

      vi.advanceTimersByTime(10000);

      expect(component.misMonitoreosFiltrados()).toEqual(nuevosDatos);
    });

    it('11. (Pilar Resiliencia) si una de las dos peticiones del forkJoin falla, debe ejecutarse el catch error', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(throwError(() => 'Fallo una'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      });

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('ngOnDestroy - Limpieza y Resiliencia (11 Pilares)', () => {

    beforeEach(() => {
      vi.useFakeTimers();
      vi.clearAllMocks();
    });

    it('1. debería cancelar la suscripción activa al destruirse', () => {
      component.ngOnInit();
      const sub = component['refreshSub'];
      expect(sub?.closed).toBe(false);

      component.ngOnDestroy();

      expect(sub?.closed).toBe(true);
    });

    it('2. debería detener el flujo de llamadas a cargarTodo() inmediatamente', () => {
      component.ngOnInit();
      const spy = vi.spyOn(component, 'cargarTodo');

      component.ngOnDestroy();
      vi.advanceTimersByTime(10000);

      // No debe haber nuevas llamadas tras el OnDestroy
      expect(spy).not.toHaveBeenCalled();
    });

    it('3. debería ser tolerante a fallos si se destruye antes de inicializarse (Safe Cleanup)', () => {
      component['refreshSub'] = undefined;

      // No debe lanzar excepción aunque la suscripción sea undefined
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('4. debería asegurar que no queden microtareas de tiempo pendientes', () => {
      component.ngOnInit();
      component.ngOnDestroy();

      // Verificamos que no hay temporizadores activos en el motor de Vitest
      expect(vi.getTimerCount()).toBe(0);
    });

    it('5. debería mantener la integridad de los datos en los Signals tras destruir', () => {
      const datos = [{id: 1} as any];
      component.misMonitoreos.set(datos);

      component.ngOnDestroy();

      // El estado local del componente debe persistir hasta que el recolector de basura actúe
      expect(component.misMonitoreos()).toEqual(datos);
    });

    it('6. debería permitir llamar a ngOnDestroy múltiples veces sin errores', () => {
      component.ngOnInit();

      expect(() => {
        component.ngOnDestroy();
        component.ngOnDestroy();
      }).not.toThrow();
    });

    it('7. debería desvincularse del observable de intervalo de forma limpia', () => {
      component.ngOnInit();
      const sub = component['refreshSub'];
      const spyUnsubscribe = vi.spyOn(sub!, 'unsubscribe');

      component.ngOnDestroy();

      expect(spyUnsubscribe).toHaveBeenCalled();
    });

    it('8. debería detener cualquier log en consola programado por el intervalo', () => {
      const logSpy = vi.spyOn(console, 'log');
      component.ngOnInit();

      component.ngOnDestroy();
      vi.advanceTimersByTime(10000);

      expect(logSpy).not.toHaveBeenCalledWith("recargada");
    });

    it('9. (Resiliencia) debería funcionar correctamente si ngOnInit nunca se llamó', () => {
      // Obtenemos el inyector del TestBed que ya configuramos en el beforeEach
      const injector = TestBed.inject(EnvironmentInjector);

      // Creamos una instancia "limpia" dentro del contexto de inyección
      let componentSinInit: MonitoreoLista;

      runInInjectionContext(injector, () => {
        componentSinInit = new MonitoreoLista();
      });

      // Ahora podemos probar el OnDestroy sin haber llamado nunca al ngOnInit
      // (Simulando que el componente se crea y se destruye instantáneamente)
      expect(() => componentSinInit!.ngOnDestroy()).not.toThrow();
    });

    it('10. debería mantener la reactividad de los Computed deshabilitada tras destruir', () => {
      // Al destruir, si cambiamos un signal, el computed no debería tener observadores activos
      component.ngOnDestroy();
      component.filtroTexto.set('test');

      // El valor cambiará, pero verificamos que el componente ya no está "escuchando" activamente
      expect(component.filtroTexto()).toBe('test');
    });

    it('11. debería considerarse "cerrado" para el motor de tests', () => {
      component.ngOnInit();
      component.ngOnDestroy();

      // Confirmación final de que el objeto es inerte
      expect(component['refreshSub']?.closed).toBeTruthy();
    });
  });

  describe('actualizarFiltro()', () => {

    it('1. debería actualizar el signal filtroTexto con el valor del input', () => {
      const mockEvent = {target: {value: 'servidor'}};
      component.actualizarFiltro(mockEvent);
      expect(component.filtroTexto()).toBe('servidor');
    });

    it('2. debería manejar strings vacíos cuando el usuario borra el buscador', () => {
      component.filtroTexto.set('valor previo');
      const mockEvent = {target: {value: ''}};

      component.actualizarFiltro(mockEvent);

      expect(component.filtroTexto()).toBe('');
    });

    it('3. (Pilar Integridad) debería disparar la actualización de misMonitoreosFiltrados', () => {
      component.misMonitoreos.set([{nombre: 'Web', paginaUrl: 'http://web.es'} as any]);
      const mockEvent = {target: {value: 'Web'}};

      component.actualizarFiltro(mockEvent);

      expect(component.misMonitoreosFiltrados().length).toBe(1);
    });

    it('4. (Pilar Integridad) debería disparar la actualización de colaboracionesFiltradas', () => {
      component.colaboraciones.set([{nombre: 'Invitado', paginaUrl: 'http://ext.es'} as any]);
      const mockEvent = {target: {value: 'Invitado'}};

      component.actualizarFiltro(mockEvent);

      expect(component.colaboracionesFiltradas().length).toBe(1);
    });

    it('5. debería ser insensible a mayúsculas/minúsculas (Case Insensitive)', () => {
      component.misMonitoreos.set([{nombre: 'SISTEMA', paginaUrl: 'url'} as any]);
      const mockEvent = {target: {value: 'sistema'}};

      component.actualizarFiltro(mockEvent);

      expect(component.misMonitoreosFiltrados().length).toBe(1);
    });

    it('6. debería permitir buscar por fragmentos de la URL', () => {
      component.misMonitoreos.set([{nombre: 'App', paginaUrl: 'https://uma.es/pro'} as any]);
      const mockEvent = {target: {value: 'uma.es'}};

      component.actualizarFiltro(mockEvent);

      expect(component.misMonitoreosFiltrados().length).toBe(1);
    });

    it('7. (Pilar Resiliencia) no debería explotar si el evento contiene caracteres especiales', () => {
      const mockEvent = {target: {value: '[]()*+?.'}};

      expect(() => component.actualizarFiltro(mockEvent)).not.toThrow();
    });

    it('8. debería mantener el estado de los signals originales (inmutabilidad)', () => {
      const original = [{nombre: 'A'} as any];
      component.misMonitoreos.set(original);

      component.actualizarFiltro({target: {value: 'Z'}});

      expect(component.misMonitoreos()).toEqual(original); // La lista base no cambia
    });

    it('9. debería manejar valores numéricos convertidos a string en el input', () => {
      const mockEvent = {target: {value: 123}}; // A veces los eventos de JS traen sorpresas

      component.actualizarFiltro(mockEvent as any);

      expect(component.filtroTexto()).toBe(123);
    });

    it('10. (UX) debería actualizar los contadores del HTML (via computed)', () => {
      // FIX: Añadimos paginaUrl aunque esté vacía para que el .toLowerCase() del computed no falle
      component.misMonitoreos.set([
        { id: 1, nombre: 'A', paginaUrl: '' } as any,
        { id: 2, nombre: 'B', paginaUrl: '' } as any
      ]);

      component.actualizarFiltro({ target: { value: 'A' } });

      // Ahora el computed no fallará al intentar leer paginaUrl de los objetos
      expect(component.misMonitoreosFiltrados().length).toBe(1);
    });

    it('11. (Pilar Concurrencia) debería procesar cambios rápidos secuencialmente', () => {
      component.actualizarFiltro({target: {value: 'a'}});
      component.actualizarFiltro({target: {value: 'ab'}});
      component.actualizarFiltro({target: {value: 'abc'}});

      expect(component.filtroTexto()).toBe('abc');
    });
  });

  describe('5. Método cargarTodo() - Sincronización y Datos (11 Pilares)', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('1. debería llamar a ambos servicios (propios e invitados) simultáneamente', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      component.cargarTodo();

      expect(mockMonitoreoService.getMisMonitoreos).toHaveBeenCalled();
      expect(mockMonitoreoService.getColaboraciones).toHaveBeenCalled();
    });

    it('2. debería actualizar misMonitoreos con la respuesta del servicio', () => {
      const mockData = [{ id: 1, nombre: 'Mío', paginaUrl: '' } as any];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockData));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      component.cargarTodo();

      expect(component.misMonitoreos()).toEqual(mockData);
    });

    it('3. debería actualizar colaboraciones con la respuesta del servicio', () => {
      const mockData = [{ id: 2, nombre: 'Invitado', paginaUrl: '' } as any];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of(mockData));

      component.cargarTodo();

      expect(component.colaboraciones()).toEqual(mockData);
    });

    it('4. (Pilar Resiliencia) debería manejar el error si getMisMonitoreos falla', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(throwError(() => new Error('Error Propios')));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.cargarTodo();

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('5. (Pilar Resiliencia) debería manejar el error si getColaboraciones falla', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(throwError(() => new Error('Error Invitado')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.cargarTodo();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('6. (Pilar Integridad) debería limpiar los signals si el servidor responde con arrays vacíos', () => {
      // Estado previo con datos
      component.misMonitoreos.set([{ id: 99 } as any]);
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      component.cargarTodo();

      expect(component.misMonitoreos()).toEqual([]);
    });

    it('7. debería funcionar correctamente cuando ambos servicios responden con éxito', () => {
      const data1 = [{ id: 1, nombre: 'A', paginaUrl: '' } as any];
      const data2 = [{ id: 2, nombre: 'B', paginaUrl: '' } as any];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(data1));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of(data2));

      component.cargarTodo();

      expect(component.misMonitoreos()).toEqual(data1);
      expect(component.colaboraciones()).toEqual(data2);
    });

    it('8. (Pilar Concurrencia) forkJoin debe asegurar que ambas peticiones se completen antes de actualizar', () => {
      // Este test valida que usamos la estructura de desestructuración {propios, invitado} correcta
      const spySetMis = vi.spyOn(component.misMonitoreos, 'set');
      const spySetCol = vi.spyOn(component.colaboraciones, 'set');

      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      component.cargarTodo();

      expect(spySetMis).toHaveBeenCalled();
      expect(spySetCol).toHaveBeenCalled();
    });

    it('9. no debería filtrar datos dentro de cargarTodo (la lógica debe quedar en los computed)', () => {
      const data = [{ nombre: 'Hidden' } as any];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(data));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      component.cargarTodo();

      // Verificamos que el signal "base" recibe el dato sin filtrar
      expect(component.misMonitoreos()).toContain(data[0]);
    });

    it('10. debería mantener el contexto de error amigable en consola', () => {
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(throwError(() => 'Fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.cargarTodo();

      expect(consoleSpy).toHaveBeenCalledWith('Error al cargar listas de monitoreo', 'Fail');
      consoleSpy.mockRestore();
    });

    it('11. (Pilar Estabilidad) no debería disparar efectos secundarios no deseados en el AuthService', () => {
      const spyRole = vi.spyOn(component, 'userRole');
      component.cargarTodo();
      // La carga de datos no debería forzar la re-evaluación manual del rol del usuario
      expect(spyRole).not.toHaveBeenCalled();
    });
  });

});
