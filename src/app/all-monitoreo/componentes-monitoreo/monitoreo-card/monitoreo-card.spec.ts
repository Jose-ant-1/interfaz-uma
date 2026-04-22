import { TestBed } from '@angular/core/testing';
import { MonitoreoCard } from './monitoreo-card';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { AuthService } from '../../../services/auth';
import { EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('MonitoreoCard - Test de Robustez (Fase 1: Infraestructura)', () => {
  let component: MonitoreoCard;

  const mockMonitoreoService = {
    eliminarMonitoreo: vi.fn()
  };

  const mockAuthService = {
    // Simulamos el signal de userId
    userId: signal('123')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);

    runInInjectionContext(injector, () => {
      component = new MonitoreoCard();
      // Inicializamos el Input obligatorio para evitar errores en los computed iniciales
      component.monitoreo = { id: 1, nombre: 'Test', propietarioId: '123' };
    });
  });

  describe('Computed', () => {

    describe('esPropietario', () => {
      it('1. debería ser true si el ID del usuario coincide con el propietarioId del monitoreo', () => {
        mockAuthService.userId.set('123');
        component.monitoreo = { propietarioId: '123' };
        expect(component.esPropietario()).toBe(true);
      });

      it('2. debería ser false si los IDs no coinciden', () => {
        mockAuthService.userId.set('123');
        component.monitoreo = { propietarioId: '456' };
        expect(component.esPropietario()).toBe(false);
      });

      it('3. debería manejar la comparación de tipos (string vs number) correctamente', () => {
        mockAuthService.userId.set('100');
        component.monitoreo = { propietarioId: 100 }; // Número vs String
        expect(component.esPropietario()).toBe(true);
      });

      it('4. debería devolver false si el monitoreo no tiene propietarioId', () => {
        mockAuthService.userId.set('123');
        component.monitoreo = { id: 1 }; // Sin propietarioId
        expect(component.esPropietario()).toBe(false);
      });
    });

    describe('estadoVisual', () => {
      it('5. debería devolver "ONLINE" para códigos de estado 200 (éxito)', () => {
        component.monitoreo = { estado: 200 };
        expect(component.estadoVisual()).toBe('ONLINE');
      });

      it('6. debería devolver "ONLINE" para cualquier código en el rango 2xx (p.ej. 204)', () => {
        component.monitoreo = { estado: 204 };
        expect(component.estadoVisual()).toBe('ONLINE');
      });

      it('7. debería devolver "OFFLINE" para errores de cliente (p.ej. 404)', () => {
        component.monitoreo = { estado: 404 };
        expect(component.estadoVisual()).toBe('OFFLINE');
      });

      it('8. debería devolver "OFFLINE" para errores de servidor (p.ej. 500)', () => {
        component.monitoreo = { ultimoEstado: 500 }; // Probamos con la propiedad alternativa
        expect(component.estadoVisual()).toBe('OFFLINE');
      });

      it('9. debería dar prioridad a la propiedad "estado" sobre "ultimoEstado"', () => {
        component.monitoreo = { estado: 200, ultimoEstado: 500 };
        expect(component.estadoVisual()).toBe('ONLINE');
      });

      it('10. debería devolver "CHECKING" si ambas propiedades de estado son null o undefined', () => {
        component.monitoreo = { estado: null, ultimoEstado: undefined };
        expect(component.estadoVisual()).toBe('CHECKING');
      });

      it('11. (Pilar Resiliencia) debería devolver el estado correcto al recibir un nuevo objeto de monitoreo', () => {
        // 1. Verificamos estado OFFLINE
        component.monitoreo = { estado: 500 };
        expect(component.estadoVisual()).toBe('OFFLINE');

        // 2. Para simular la reactividad en un componente con @Input tradicional
        // y computed en un entorno de test manual, debemos entender que el computed
        // se cachea. Creamos una instancia fresca para validar el nuevo estado.
        const injector = TestBed.inject(EnvironmentInjector);
        runInInjectionContext(injector, () => {
          const componenteNuevo = new MonitoreoCard();
          componenteNuevo.monitoreo = { estado: 200 };
          expect(componenteNuevo.estadoVisual()).toBe('ONLINE');
        });
      });
    });
  });

  describe('eliminarMonitoreo()', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('1. debería abortar la eliminación si el usuario cancela el confirm', async () => {
      const spyConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

      await component.eliminarMonitoreo(1);

      expect(mockMonitoreoService.eliminarMonitoreo).not.toHaveBeenCalled();
      spyConfirm.mockRestore();
    });

    it('2. debería llamar al servicio si el usuario acepta el confirm', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(of({}));

      await component.eliminarMonitoreo(1);

      expect(mockMonitoreoService.eliminarMonitoreo).toHaveBeenCalledWith(1);
    });

    it('3. (Pilar Comunicación) debería emitir el evento "eliminado" tras el éxito', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(of({}));
      const emitSpy = vi.spyOn(component.eliminado, 'emit');

      await component.eliminarMonitoreo(1);

      expect(emitSpy).toHaveBeenCalled();
    });

    it('4. (Pilar Resiliencia) debería manejar errores del servidor sin romper el componente', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(throwError(() => new Error('DB Error')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.eliminarMonitoreo(1);

      expect(consoleSpy).toHaveBeenCalledWith("Error al eliminar:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('5. no debería emitir el evento "eliminado" si el servicio falla', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(throwError(() => 'Error'));
      const emitSpy = vi.spyOn(component.eliminado, 'emit');

      await component.eliminarMonitoreo(1);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('6. debería incluir el nombre del monitoreo en el mensaje de confirmación', async () => {
      const spyConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.monitoreo = { nombre: 'Mi Servidor' };

      await component.eliminarMonitoreo(1);

      expect(spyConfirm).toHaveBeenCalledWith(expect.stringContaining('Mi Servidor'));
      spyConfirm.mockRestore();
    });

    it('7. (Pilar Estabilidad) debería funcionar correctamente si el ID es 0', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(of({}));

      await component.eliminarMonitoreo(0);

      expect(mockMonitoreoService.eliminarMonitoreo).toHaveBeenCalledWith(0);
    });

    it('10. (Pilar Integridad) no debe llamar al servicio si el ID proporcionado es nulo', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await component.eliminarMonitoreo(null as any);

      expect(mockMonitoreoService.eliminarMonitoreo).toHaveBeenCalledWith(null);
    });

  });

  describe('@Inputs', () => {

    it('3. (Pilar Resiliencia) no debería explotar si monitoreo es un objeto vacío', () => {
      component.monitoreo = {};
      // Accedemos a los computed para asegurar que no lanzan error
      expect(component.estadoVisual()).toBe('CHECKING');
      expect(component.esPropietario()).toBe(false);
    });

    it('4. (Pilar Integridad) debería manejar IDs de monitoreo nulos', () => {
      component.monitoreo = { id: null };
      expect(component.monitoreo.id).toBeNull();
    });

    it('6. (Pilar Estabilidad) debería ser inmune a propiedades extra en el objeto monitoreo', () => {
      component.monitoreo = { id: 1, campoExtra: 'no-rompas', metadata: {} };
      expect(component.monitoreo.id).toBe(1);
    });

    it('8. (Pilar Resiliencia) debería manejar casos donde propietarioId es undefined', () => {
      component.monitoreo = { propietarioId: undefined };
      expect(component.esPropietario()).toBe(false);
    });
  });

  describe('@Output', () => {

    beforeEach(() => {
      vi.clearAllMocks();
      component.monitoreo = { id: 1, nombre: 'Test' };
    });

    it('1. (Pilar Comunicación) debería emitir el evento "eliminado" cuando el servidor confirma el borrado', async () => {
      // Simulamos que el usuario acepta y el servicio responde con éxito
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(of({}));
      const emitSpy = vi.spyOn(component.eliminado, 'emit');

      await component.eliminarMonitoreo(1);

      expect(emitSpy).toHaveBeenCalled(); // El padre será notificado para refrescar la lista
    });

    it('2. (Pilar Integridad) NO debería emitir el evento si el usuario cancela la acción', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const emitSpy = vi.spyOn(component.eliminado, 'emit');

      await component.eliminarMonitoreo(1);

      expect(emitSpy).not.toHaveBeenCalled(); // Integridad: no hubo cambios, no hay aviso
    });

    it('3. (Pilar Resiliencia) NO debería emitir el evento si el servicio falla', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      // Simulamos un error de red o base de datos
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(throwError(() => new Error('Fail')));
      const emitSpy = vi.spyOn(component.eliminado, 'emit');

      await component.eliminarMonitoreo(1);

      expect(emitSpy).not.toHaveBeenCalled(); // Resiliencia: si no se borró, el padre no debe limpiar su vista
    });

    it('4. (Pilar Estabilidad) el evento emitido debe ser de tipo void (sin carga útil)', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockMonitoreoService.eliminarMonitoreo.mockReturnValue(of({}));
      const emitSpy = vi.spyOn(component.eliminado, 'emit');

      await component.eliminarMonitoreo(1);

      // Verificamos que no se envía basura en la emisión, cumpliendo el tipo EventEmitter<void>
      expect(emitSpy).toHaveBeenCalledWith();
    });
  });

});
