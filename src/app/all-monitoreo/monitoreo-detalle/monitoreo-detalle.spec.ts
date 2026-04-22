import {ComponentFixture, TestBed} from '@angular/core/testing'; // Añade estos
import {MonitoreoDetalles} from './monitoreo-detalle';
import {MonitoreoService} from '../../services/monitoreo.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {of, throwError} from 'rxjs';
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {CommonModule} from '@angular/common';

describe('MonitoreoDetalles - Test de Robustez (Fase 1: Infraestructura)', () => {
  let component: MonitoreoDetalles;
  let fixture: ComponentFixture<MonitoreoDetalles>;

  const mockMonitoreoService = {
    getMonitoreoPorId: vi.fn().mockReturnValue(of({nombre: 'Test'}))
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: vi.fn().mockReturnValue('123')
      }
    }
  };

  beforeEach(async () => {
    localStorage.clear();

    // 1. OVERRIDE: Evitamos carga de HTML físico y usamos Control Flow de Angular 19
    TestBed.overrideComponent(MonitoreoDetalles, {
      set: {
        template: `
          @if (cargando()) {
            <div id="loading-spinner">Cargando...</div>
          } @else if (errorCarga()) {
            <div id="error-message">{{ errorCarga() }}</div>
          } @else {
            <div class="max-w-4xl">
              <h1 id="monitoreo-nombre">{{ monitoreo()?.nombre }}</h1>
            </div>
          }
        `,
        imports: [CommonModule]
      }
    });

    await TestBed.configureTestingModule({
      providers: [
        {provide: MonitoreoService, useValue: mockMonitoreoService},
        {provide: Router, useValue: mockRouter},
        {provide: ActivatedRoute, useValue: mockActivatedRoute}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MonitoreoDetalles);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('MonitoreoDetalles - Pilares de Inyección y Signals', () => {
    // ... (setup del TestBed y overrideComponent que ya tenemos)

    // PILAR 1: Inyección del Componente
    it('1. debería garantizar la correcta inyección del componente', () => {
      expect(component).toBeTruthy();
    });

    // PILAR 4: Estado Inicial del Signal de Datos
    it('4. debería inicializar el signal monitoreo() como null', () => {
      expect(component.monitoreo()).toBeNull();
    });

    // PILAR 5: Test de Estado de Carga (Feedback Visual)
    it('5. debería inicializar cargando() en true para activar el feedback visual inmediato', () => {
      expect(component.cargando()).toBe(true);
    });

    // PILAR 7: Test de Protección/Seguridad (Admin)
    it('7. debería inicializar isAdmin() en false por defecto (Pilar de Blindaje)', () => {
      expect(component.isAdmin()).toBe(false);
    });

    // PILAR 8: Test de Protección/Seguridad (Dueño)
    it('8. debería inicializar esDuenio() en false por defecto para evitar fugas de permisos', () => {
      expect(component.esDuenio()).toBe(false);
    });

    // PILAR 9: Test de Estado de Interfaz (Spinner)
    it('9. debería mostrar el spinner de carga en el DOM inicial', () => {
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('#loading-spinner');
      expect(spinner).toBeTruthy();
    });

    // PILAR 11: Test de Sanitización de Memoria (Limpieza inicial)
    it('11. debería asegurar que el localStorage está limpio antes de procesar señales', () => {
      // Verificamos que nuestro beforeEach hizo su trabajo de limpieza
      expect(localStorage.getItem('userRole')).toBeNull();
    });

    // PILAR: Reactividad de Signals
    it('12. debería actualizar el DOM automáticamente cuando el signal monitoreo() recibe datos', async () => {
      // 1. IMPORTANTE: Esperamos a que el ngOnInit y su inicializarDatos() terminen
      // Esto limpia cualquier micro-tarea pendiente en el componente
      await fixture.whenStable();

      // 2. Ahora sí, forzamos el estado que queremos testear (Reactividad pura)
      component.cargando.set(false);
      component.errorCarga.set(null); // Limpiamos posibles errores previos

      const datosMock = {
        nombre: 'Web Principal',
        paginaUrl: 'https://test.com',
        propietario: {id: 1, nombre: 'Admin'}
      };

      component.monitoreo.set(datosMock as any);

      // 3. Forzamos la detección de cambios y esperamos al ciclo de renderizado
      fixture.detectChanges();
      await fixture.whenStable();

      // 4. Verificación
      const titulo = fixture.nativeElement.querySelector('#monitoreo-nombre');

      expect(titulo, 'El título debería existir en el DOM tras quitar el estado de carga').toBeTruthy();
      expect(titulo.textContent).toContain('Web Principal');
    });

    // PILAR: Manejo de Errores en Signal
    it('13. debería reaccionar al cambio de errorCarga() reflejándolo en el estado de la interfaz', async () => {
      // 1. Pilar de Sincronización: Esperamos a que el componente termine su carga inicial del ngOnInit
      await fixture.whenStable();

      // 2. Forzamos el estado de error manualmente
      component.errorCarga.set('Error Crítico');
      component.cargando.set(false);

      // 3. Sincronizamos el DOM
      fixture.detectChanges();
      await fixture.whenStable();

      // 4. Verificación del Pilar de Interfaz
      const spinner = fixture.nativeElement.querySelector('#loading-spinner');
      const mensajeError = fixture.nativeElement.querySelector('#error-message');

      expect(spinner, 'El spinner debería desaparecer cuando cargando es false').toBeFalsy();
      expect(mensajeError, 'Debería mostrarse el mensaje de error').toBeTruthy();
      expect(mensajeError.textContent).toContain('Error Crítico');
    });
  });

  describe('ngOnInit - Pilares de Identidad, Localización y Flujo', () => {

    // PILAR 1: Localización (Lectura de ID)
    it('1. debería extraer el ID de la ruta paramétrica correctamente', () => {
      const spy = vi.spyOn(mockActivatedRoute.snapshot.paramMap, 'get');
      component.ngOnInit();
      expect(spy).toHaveBeenCalledWith('id');
    });

    // PILAR 2: Identidad (Admin positivo)
    it('2. debería marcar isAdmin como true si el localStorage contiene ADMIN', () => {
      localStorage.setItem('userRole', 'ADMIN');
      component.ngOnInit();
      expect(component.isAdmin()).toBe(true);
    });

    // PILAR 3: Blindaje de Identidad (Admin negativo)
    it('3. debería mantener isAdmin en false si el rol es USER o nulo', () => {
      localStorage.setItem('userRole', 'USER');
      component.ngOnInit();
      expect(component.isAdmin()).toBe(false);
    });

    // PILAR 4: Sanitización (Case Insensitive)
    it('4. debería ser insensible a mayúsculas/minúsculas al procesar el rol "admin"', () => {
      localStorage.setItem('userRole', 'admin');
      component.ngOnInit();
      expect(component.isAdmin()).toBe(true);
    });

    // PILAR 5: Caso de Borde (ID inexistente)
    it('5. debería activar errorCarga si el ID es nulo en la ruta', () => {
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue(null);
      component.ngOnInit();
      expect(component.errorCarga()).toBe('ID de monitoreo no válido');
      expect(component.cargando()).toBe(false);
    });

    // PILAR 6: Integridad de Flujo (Llamada a inicializarDatos)
    it('6. debería disparar la carga de datos si el ID es válido', () => {
      // @ts-ignore - espíamos el método privado
      const spy = vi.spyOn(component, 'inicializarDatos');
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('123');

      component.ngOnInit();
      expect(spy).toHaveBeenCalledWith(123);
    });

    // PILAR 7: Conversión de Tipos (Sanitización numérica)
    it('7. debería convertir el ID de string a number antes de inicializar datos', () => {
      // @ts-ignore
      const spy = vi.spyOn(component, 'inicializarDatos');
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('456');

      component.ngOnInit();
      expect(spy).toHaveBeenCalledWith(456); // Verifica que no sea '456' string
    });

    // PILAR 8: Blindaje de Re-entrada (Reset de estados)
    it('8. debería asegurar que los errores se limpian al re-inicializar el componente', () => {
      component.errorCarga.set('Error previo');
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('123');

      component.ngOnInit();
      // Nota: inicializarDatos pone errorCarga en null al empezar
      expect(component.errorCarga()).toBeNull();
    });

    // PILAR 9: Protección de Memoria (Storage vacío)
    it('9. debería manejar correctamente un localStorage sin userRole', () => {
      localStorage.removeItem('userRole');
      component.ngOnInit();
      expect(component.isAdmin()).toBe(false);
    });

    // PILAR 10: Orden de Ejecución (Roles antes que Datos)
    it('10. debería procesar el rol antes de intentar cargar los datos', () => {
      const order: string[] = [];

      // Usamos un mock más directo sobre el objeto Storage
      const localStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === 'userRole') {
          order.push('role');
          return 'ADMIN';
        }
        return null;
      });

      // @ts-ignore - Espiamos el método privado
      const datosSpy = vi.spyOn(component, 'inicializarDatos').mockImplementation(() => {
        order.push('datos');
        return Promise.resolve();
      });

      component.ngOnInit();

      // Verificación del Pilar de Orden
      expect(order).toEqual(['role', 'datos']);

      // Limpieza manual del espía de prototype para no afectar otros tests
      localStorageSpy.mockRestore();
    });

    // PILAR 11: Estabilidad (DOM Feedback en ID inválido)
    it('11. debería renderizar el mensaje de error en el DOM si no hay ID', async () => {
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue(null);
      component.ngOnInit();
      fixture.detectChanges();
      await fixture.whenStable();

      const errorDiv = fixture.nativeElement.querySelector('#error-message');
      expect(errorDiv.textContent).toContain('ID de monitoreo no válido');
    });
  });

  describe('Lógica de Datos y Negocio (inicializarDatos y verificarPropiedad)', () => {

    it('1. debería cargar los datos correctamente y actualizar el signal monitoreo (Camino Feliz)', async () => {
      const mockData = {nombre: 'Web Producción', propietario: {id: 99}};
      // Configuramos el mock ANTES de disparar la lógica
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of(mockData));
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('99');

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.monitoreo()).toEqual(mockData);
    });

    it('2. debería marcar esDuenio como true si el ID del usuario coincide (Pilar de Validación de Negocio)', async () => {
      const mockData = {propietario: {id: 5}};
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of(mockData));
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('5');
      localStorage.setItem('userId', '5');

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.esDuenio()).toBe(true);
    });

    it('3. debería manejar errores de red activando errorCarga (Pilar de Resiliencia)', async () => {
      // 1. Setup
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(throwError(() => new Error('Simulado')));
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('123');

      // 2. Ejecutar la lógica asíncrona
      // Forzamos la ejecución y esperamos a que todas las promesas internas se resuelvan
      await component.ngOnInit();

      // 3. Este tick manual ayuda a Vitest a procesar el bloque 'finally'
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.errorCarga()).toBe('No se pudo cargar la información del monitoreo');
      expect(component.cargando()).toBe(false);
    });

    it('4. debería ser robusto si el objeto propietario es nulo (Pilar de Integridad)', async () => {
      const mockData = {nombre: 'Web Sin Dueño', propietario: null};
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of(mockData));

      component.ngOnInit();
      await fixture.whenStable();

      // Gracias al optional chaining (data.propietario?.id), esto no debe explotar
      expect(component.esDuenio()).toBe(false);
      expect(component.monitoreo()).toBeDefined();
    });

    it('5. debería reflejar los datos cargados en el DOM (Pilar de Integración)', async () => {
      // 1. Setup
      const mockData = {nombre: 'Servidor API', propietario: {id: 1}};
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of(mockData));
      mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue('1');

      // 2. Ejecutar
      await component.ngOnInit();

      // 3. Sincronización agresiva para la terminal
      fixture.detectChanges(); // Para procesar el cambio de cargando(true) a (false)
      await fixture.whenStable();
      fixture.detectChanges(); // Para renderizar el @if (monitoreo())

      const titulo = fixture.nativeElement.querySelector('#monitoreo-nombre');

      expect(titulo, 'El título debería existir en el DOM tras la carga').not.toBeNull();
      expect(titulo?.textContent).toContain('Servidor API');
    });
  });

});
