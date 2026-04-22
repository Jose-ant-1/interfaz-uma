import { TestBed } from '@angular/core/testing';
import { MonitoreoAnyadir } from './monitoreo-anyadir';
import { MonitoreoService } from '../../services/monitoreo.service';
import { PaginaService } from '../../services/pagina.service';
import { Router } from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core'; // <--- IMPORTANTE
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MonitoreoAnyadir - Test de Robustez (Fase 1: Infraestructura)', () => {
  let component: MonitoreoAnyadir;

  const mockMonitoreoService = { crearMonitoreo: vi.fn() };
  const mockPaginaService = { getPaginas: vi.fn().mockReturnValue(of([])) };
  const mockRouter = { navigate: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: PaginaService, useValue: mockPaginaService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    // Forzamos el tipado para que runInInjectionContext no proteste
    const injector = TestBed.inject(EnvironmentInjector);

    /**
     * Al usar el inyector real de la plataforma, 'inject()' funcionará
     * dentro de la clase, pero como instanciamos con 'new',
     * el decorador @Component NO se procesará (evitando el error de HTML).
     */
    runInInjectionContext(injector, () => {
      component = new MonitoreoAnyadir();
    });
  });

  describe('Signals e Inyectables', () => {
    it('1. debería inyectar correctamente MonitoreoService', () => {
      expect(component['monitoreoService']).toBeDefined();
    });

    it('2. debería inyectar correctamente PaginaService', () => {
      expect(component['paginaService']).toBeDefined();
    });

    it('3. debería inyectar correctamente Router', () => {
      expect(component['router']).toBeDefined();
    });

    it('4. debería inicializar el signal paginasExistentes como un array vacío', () => {
      expect(component.paginasExistentes()).toEqual([]);
    });

    it('5. debería inicializar el signal cargando en false', () => {
      expect(component.cargando()).toBe(false);
    });

    it('6. debería inicializar la propiedad nombre como string vacío', () => {
      expect(component.nombre).toBe('');
    });

    it('7. debería inicializar la propiedad urlSeleccionada como string vacío', () => {
      expect(component.urlSeleccionada).toBe('');
    });

    it('8. debería inicializar minutos con el valor por defecto 5', () => {
      expect(component.minutos).toBe(5);
    });

    it('9. debería inicializar repeticiones con el valor por defecto 3', () => {
      expect(component.repeticiones).toBe(3);
    });

    it('10. debería permitir la actualización del signal cargando', () => {
      component.cargando.set(true);
      expect(component.cargando()).toBe(true);
    });

    it('11. debería permitir la actualización del signal paginasExistentes', () => {
      const mockPaginas = [{ id: 1, nombre: 'Test', url: 'http://test.com' }];
      component.paginasExistentes.set(mockPaginas as any);
      expect(component.paginasExistentes()).toEqual(mockPaginas);
    });
  });

  describe('ngOnInit()', () => {

    it('1. debería invocar el método de carga al inicializar', () => {
      const spy = vi.spyOn(component as any, 'inicializarComponente');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });

    it('2. debería mapear correctamente las páginas recibidas al signal', async () => {
      const mockPaginas = [{ id: 1, nombre: 'Test', url: 'http://test.com' }];
      mockPaginaService.getPaginas.mockReturnValue(of(mockPaginas));

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.paginasExistentes()).toEqual(mockPaginas);
    });

    it('3. debería manejar la respuesta del servicio si viene vacía []', async () => {
      mockPaginaService.getPaginas.mockReturnValue(of([]));

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.paginasExistentes()).toEqual([]);
    });

    it('4. debería capturar errores de red sin romper la ejecución del componente', async () => {
      mockPaginaService.getPaginas.mockReturnValue(throwError(() => new Error('Net Error')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('5. debería asegurar que el signal "cargando" termine en false tras éxito', async () => {
      mockPaginaService.getPaginas.mockReturnValue(of([]));

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.cargando()).toBe(false);
    });

    it('6. debería asegurar que el signal "cargando" termine en false tras error', async () => {
      mockPaginaService.getPaginas.mockReturnValue(throwError(() => 'Error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.cargando()).toBe(false);
    });

    it('7. debería mantener el "nombre" como string vacío al arrancar', () => {
      component.ngOnInit();
      expect(component.nombre).toBe('');
    });

    it('8. debería mantener la "urlSeleccionada" como string vacío al arrancar', () => {
      component.ngOnInit();
      expect(component.urlSeleccionada).toBe('');
    });

    it('9. debería validar que los minutos por defecto son 5', () => {
      component.ngOnInit();
      expect(component.minutos).toBe(5);
    });

    it('10. debería validar que las repeticiones por defecto son 3', () => {
      component.ngOnInit();
      expect(component.repeticiones).toBe(3);
    });

    it('11. debería ser capaz de re-inicializarse correctamente si se llama a ngOnInit de nuevo', async () => {
      const data1 = [{ id: 1 }];
      const data2 = [{ id: 2 }];

      mockPaginaService.getPaginas.mockReturnValue(of(data1));
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      mockPaginaService.getPaginas.mockReturnValue(of(data2));
      component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.paginasExistentes()).toEqual(data2);
    });
  });

  describe('guardar()', () => {

    beforeEach(() => {
      // ESTO ES CLAVE: Limpiamos las llamadas de los tests anteriores
      vi.clearAllMocks();
    });

    it('1. (Pilar Validación) debería abortar si el nombre está vacío', async () => {
      component.nombre = '';
      const spyAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await component.guardar();

      expect(spyAlert).toHaveBeenCalledWith("Por favor, rellena todos los campos");
      expect(mockMonitoreoService.crearMonitoreo).not.toHaveBeenCalled();
      spyAlert.mockRestore();
    });

    it('2. (Pilar Validación) debería abortar si no hay URL seleccionada', async () => {
      component.nombre = 'Test';
      component.urlSeleccionada = '';
      const spyAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await component.guardar();

      expect(spyAlert).toHaveBeenCalled();
      expect(mockMonitoreoService.crearMonitoreo).not.toHaveBeenCalled();
      spyAlert.mockRestore();
    });

    it('3. (Pilar Integridad) debería enviar el nombre con trim() al servicio', async () => {
      // Configuramos para que el servicio responda éxito
      mockMonitoreoService.crearMonitoreo.mockReturnValue(of({}));
      component.nombre = '   Mi Monitoreo   ';
      component.urlSeleccionada = 'http://test.com';
      component.minutos = 5;
      component.repeticiones = 3;

      await component.guardar();

      // Corregido: Ahora esperamos que SÍ se llame, pero con el texto limpio
      expect(mockMonitoreoService.crearMonitoreo).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Mi Monitoreo' })
      );
    });

    it('4. (Pilar Validación) debería abortar si minutos es menor a 1', async () => {
      component.nombre = 'Test';
      component.urlSeleccionada = 'http://test.com';
      component.minutos = 0;
      const spyAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await component.guardar();

      expect(spyAlert).toHaveBeenCalledWith("Valores de tiempo o reintentos no válidos.");
      expect(mockMonitoreoService.crearMonitoreo).not.toHaveBeenCalled();
      spyAlert.mockRestore();
    });

    it('5. (Pilar Estado UI) debería gestionar el signal "cargando" correctamente', async () => {
      mockMonitoreoService.crearMonitoreo.mockReturnValue(of({}));
      component.nombre = 'Test';
      component.urlSeleccionada = 'http://test.com';

      await component.guardar();

      // Tras el await, cargando debe haber vuelto a false
      expect(component.cargando()).toBe(false);
    });

    it('6. (Pilar Flujo Feliz) debería enviar el payload correcto', async () => {
      component.nombre = 'Test';
      component.urlSeleccionada = 'http://test.com';
      component.minutos = 10;
      component.repeticiones = 5;
      mockMonitoreoService.crearMonitoreo.mockReturnValue(of({}));

      await component.guardar();

      expect(mockMonitoreoService.crearMonitoreo).toHaveBeenCalledWith({
        nombre: 'Test',
        paginaUrl: 'http://test.com',
        minutos: 10,
        repeticiones: 5
      });
    });

    it('7. (Pilar Navegación) debería redirigir a la ruta correcta', async () => {
      component.nombre = 'Test';
      component.urlSeleccionada = 'http://test.com';
      mockMonitoreoService.crearMonitoreo.mockReturnValue(of({}));

      await component.guardar();

      // AJUSTADO: Usamos la ruta real de tu aplicación
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    it('8. (Pilar Error) debería loguear error si el servicio falla', async () => {
      component.nombre = 'Test';
      component.urlSeleccionada = 'http://test.com';
      mockMonitoreoService.crearMonitoreo.mockReturnValue(throwError(() => new Error('Fail')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.guardar();

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('9. (Pilar Resiliencia) cargando debe ser false tras un error 500', async () => {
      component.nombre = 'Test';
      component.urlSeleccionada = 'http://test.com';
      mockMonitoreoService.crearMonitoreo.mockReturnValue(throwError(() => 'Error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.guardar();

      expect(component.cargando()).toBe(false);
    });

    it('10. (Pilar Feedback) alert debe ser llamado en fallos de validación', async () => {
      const spyAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
      component.nombre = '';

      await component.guardar();

      expect(spyAlert).toHaveBeenCalled();
      spyAlert.mockRestore();
    });

    it('11. (Pilar Limpieza) no debe navegar si los campos están sucios/inválidos', async () => {
      component.nombre = 'Solo nombre';
      component.urlSeleccionada = ''; // URL vacía

      await component.guardar();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

});
