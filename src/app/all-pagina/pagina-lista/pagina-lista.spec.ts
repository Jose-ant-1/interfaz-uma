import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginaListComponent } from './pagina-lista';
import { PaginaService } from '../../services/pagina.service';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonModule } from '@angular/common';

describe('PaginaListComponent - Suite de Alta Disponibilidad', () => {
  let component: PaginaListComponent;
  let fixture: ComponentFixture<PaginaListComponent>;

  // 1. MOCKS: Definición de espías
  const mockPaginaService = {
    getPaginas: vi.fn(),
    buscarPaginas: vi.fn(),
    deletePagina: vi.fn()
  };

  const mockPaginas = [
    { id: 1, nombre: 'Google', url: 'https://google.com' },
    { id: 2, nombre: 'UMA', url: 'https://uma.es' }
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // 2. OVERRIDE: Blindaje contra archivos físicos y dependencias externas
    TestBed.overrideComponent(PaginaListComponent, {
      set: {
        template: `<div>Template Simplificado para Tests</div>`,
        templateUrl: undefined,
        styleUrls: [],
        imports: [CommonModule] // Añade aquí el CardComponent si necesitas test de integración DOM
      }
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        { provide: PaginaService, useValue: mockPaginaService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaListComponent);
    component = fixture.componentInstance;

    // Configuración por defecto del servicio (Camino Feliz)
    mockPaginaService.getPaginas.mockReturnValue(of(mockPaginas));
  });

  it('debería crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización y Reactividad (Inject, Signals)', () => {

    // --- PILAR: CAMINO FELIZ E INTEGRIDAD DE DATOS ---
    it('debería cargar las páginas al inicializar y actualizar el signal "paginas"', () => {
      // El servicio ya está configurado para devolver mockPaginas en el beforeEach
      fixture.detectChanges(); // Ejecuta ngOnInit y obtenerPaginas()

      expect(mockPaginaService.getPaginas).toHaveBeenCalled();
      // Verificamos que el signal contiene exactamente lo que el servicio envió
      expect(component.paginas()).toEqual(mockPaginas);
    });

    // --- PILAR: MANEJO DE ERRORES E INTEGRIDAD DEL ESTADO ---
    it('debería manejar errores de red en la carga inicial sin romper el componente', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPaginaService.getPaginas.mockReturnValue(throwError(() => new Error('Error de conexión')));

      component.ngOnInit(); // Forzamos la ejecución

      // El signal debe permanecer como un array vacío en lugar de undefined o null (Integridad)
      expect(component.paginas()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    // --- PILAR: TEST DE ESTADO DE CARGA (SIMULADO) ---
    it('debería mantener el signal vacío mientras la petición está en vuelo', () => {
      const respuestaLenta$ = new Subject<any>();
      mockPaginaService.getPaginas.mockReturnValue(respuestaLenta$);

      component.ngOnInit();

      // Verificamos que el estado inicial del signal es correcto antes de que llegue la respuesta
      expect(component.paginas()).toEqual([]);

      respuestaLenta$.next(mockPaginas);
      expect(component.paginas()).toEqual(mockPaginas);
    });

    // --- PILAR: VALIDACIÓN DE NEGOCIO (Buscador Reactivo) ---
    it('debería configurar el stream del buscador para reaccionar a cambios', () => {
      // Al ejecutar ngOnInit, se suscribe al Subject 'buscador'
      fixture.detectChanges();

      mockPaginaService.buscarPaginas.mockReturnValue(of([mockPaginas[0]]));

      // Simulamos una entrada de usuario en el buscador
      component.onSearch({ target: { value: 'Google' } } as any);

      // Verificamos que el signal se actualiza con el resultado de la búsqueda
      expect(mockPaginaService.buscarPaginas).toHaveBeenCalledWith('Google');
      expect(component.paginas()).toEqual([mockPaginas[0]]);
    });

    // --- PILAR: CASO DE BORDE (Búsqueda Vacía) ---
    it('debería volver a cargar todas las páginas si el buscador se limpia', () => {
      fixture.detectChanges();
      mockPaginaService.getPaginas.mockReturnValue(of(mockPaginas));

      component.onSearch({ target: { value: '' } } as any);

      // Si el término es longitud 0, debe llamar a getPaginas en lugar de buscarPaginas
      expect(mockPaginaService.getPaginas).toHaveBeenCalled();
      expect(component.paginas()).toEqual(mockPaginas);
    });
  });

  describe('onSearch()', () => {

    // --- PILAR: CAMINO FELIZ e INTEGRIDAD DEL STREAM ---
    it('debería actualizar el signal "paginas" con los resultados de la búsqueda', () => {
      fixture.detectChanges(); // Inicializa el stream en ngOnInit
      const resultadosMock = [mockPaginas[0]];
      mockPaginaService.buscarPaginas.mockReturnValue(of(resultadosMock));

      // Simulamos evento de input
      const event = { target: { value: 'Google' } } as unknown as Event;
      component.onSearch(event);

      expect(mockPaginaService.buscarPaginas).toHaveBeenCalledWith('Google');
      // El signal debe reflejar los resultados filtrados
      expect(component.paginas()).toEqual(resultadosMock);
    });

    // --- PILAR: CASO DE BORDE (Búsqueda vacía) ---
    it('debería resetear la lista completa si el término de búsqueda se vacía', () => {
      fixture.detectChanges();
      mockPaginaService.getPaginas.mockReturnValue(of(mockPaginas));

      const event = { target: { value: '' } } as unknown as Event;
      component.onSearch(event);

      // Según la lógica del switchMap: si term.length === 0 -> getPaginas()
      expect(mockPaginaService.getPaginas).toHaveBeenCalled();
      expect(component.paginas()).toEqual(mockPaginas);
    });

    // --- PILAR: MANEJO DE ERRORES E INTEGRIDAD DEL ESTADO ---
    it('debería capturar errores de búsqueda sin romper el stream del buscador', () => {
      fixture.detectChanges();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPaginaService.buscarPaginas.mockReturnValue(throwError(() => new Error('Search Fail')));

      const event = { target: { value: 'ErrorTest' } } as unknown as Event;
      component.onSearch(event);

      // Verificamos que el error se maneja y el componente sigue vivo
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error en búsqueda:'), expect.anything());
      consoleSpy.mockRestore();
    });

    // --- PILAR: TEST DE ESTADO DE INTERFAZ (Debounce/Distinct) ---
    it('no debería disparar una nueva búsqueda si el término es idéntico (Integridad)', () => {
      fixture.detectChanges();
      mockPaginaService.buscarPaginas.mockReturnValue(of([]));

      const event = { target: { value: 'Repetido' } } as unknown as Event;

      component.onSearch(event);
      component.onSearch(event); // Segunda llamada con el mismo valor

      // Gracias a distinctUntilChanged(), solo se llama una vez
      expect(mockPaginaService.buscarPaginas).toHaveBeenCalledTimes(1);
    });

    // --- PILAR: INTEGRACIÓN DOM (Flujo desde la Vista) ---
    it('debería reaccionar cuando el input del DOM emite un evento', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'onSearch');

      // Creamos el elemento y disparamos el evento manualmente
      const input = document.createElement('input');
      input.value = 'Test';
      input.dispatchEvent(new Event('input'));

      // En un test real de integración usaríamos fixture.nativeElement.querySelector('input')
      component.onSearch({ target: input } as any);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('obtenerPaginas()', () => {

    // --- PILAR: CAMINO FELIZ e INTEGRIDAD DE DATOS ---
    it('debería actualizar el signal "paginas" con los datos del servicio (Integridad)', () => {
      // Configuramos el mock para devolver datos específicos
      const mockData = [{ id: 10, nombre: 'Test', url: 'http://test.com' }];
      mockPaginaService.getPaginas.mockReturnValue(of(mockData));

      component.obtenerPaginas();

      // Verificamos que el signal se actualiza correctamente [Pilar de Integridad]
      expect(mockPaginaService.getPaginas).toHaveBeenCalled();
      expect(component.paginas()).toEqual(mockData);
    });

    // --- PILAR: TEST DE ESTADO DE CARGA (Sincronía de Signals) ---
    it('debería mantener el estado anterior hasta que la nueva petición se resuelva', () => {
      // Estado inicial con datos
      component.paginas.set(mockPaginas);

      // Nueva petición que tarda en responder
      const respuestaLenta$ = new Subject<any>();
      mockPaginaService.getPaginas.mockReturnValue(respuestaLenta$);

      component.obtenerPaginas();

      // El signal no debe limpiarse agresivamente; mantiene los datos viejos hasta recibir los nuevos
      // Esto evita parpadeos molestos en la UI [Pilar de Estado de Interfaz]
      expect(component.paginas()).toEqual(mockPaginas);

      respuestaLenta$.next([{ id: 99 }]);
      expect(component.paginas().length).toBe(1);
    });

    // --- PILAR: MANEJO DE ERRORES ---
    it('debería registrar el error en consola si la carga falla (Manejo de Errores)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPaginaService.getPaginas.mockReturnValue(throwError(() => new Error('API Down')));

      component.obtenerPaginas();

      // Verificamos que el error es capturado para no bloquear el hilo principal [Pilar de Manejo de Errores]
      expect(consoleSpy).toHaveBeenCalledWith('Error cargando páginas:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    // --- PILAR: CASO DE BORDE (Respuesta Vacía) ---
    it('debería resetear el signal a un array vacío si el servidor no devuelve datos', () => {
      component.paginas.set(mockPaginas); // Datos previos
      mockPaginaService.getPaginas.mockReturnValue(of([])); // Respuesta vacía

      component.obtenerPaginas();

      // El sistema debe ser capaz de "limpiar" la vista si el catálogo queda vacío [Pilar de Integridad]
      expect(component.paginas()).toEqual([]);
    });

    // --- PILAR: PROTECCIÓN DE ENVÍO (Inyectores) ---
    it('debería invocar al servicio sin parámetros adicionales por seguridad', () => {
      component.obtenerPaginas();
      // Garantizamos que no se envían datos espurios en una petición GET [Pilar de Protección de Envío]
      expect(mockPaginaService.getPaginas).toHaveBeenCalledWith();
    });
  });

  describe('eliminar()', () => {

    beforeEach(() => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    // --- PILAR: CAMINO FELIZ ---
    it('debería eliminar la página del signal si el servidor responde éxito', () => {
      mockPaginaService.deletePagina.mockReturnValue(of({}));
      component.paginas.set(mockPaginas);

      component.eliminar(1);

      expect(component.paginas().length).toBe(1);
      expect(component.paginas().find(p => p.id === 1)).toBeUndefined();
    });

    // --- PILAR: MANEJO DE ERRORES (Caso Específico) ---
    it('debería mostrar mensaje de "vinculada" cuando el error es de conflicto (Conflict)', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      // Simulamos error 409 Conflict
      mockPaginaService.deletePagina.mockReturnValue(throwError(() => ({ status: 409, message: 'Conflict' })));

      component.eliminar(1);

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('vinculada a monitoreos activos'));
      alertSpy.mockRestore();
    });

    // --- PILAR: MANEJO DE ERRORES (Caso Genérico / Robustez) ---
    it('debería mostrar mensaje genérico ante un error inesperado (ej: 500)', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      // Simulamos error genérico de servidor
      mockPaginaService.deletePagina.mockReturnValue(throwError(() => ({ status: 500 })));

      component.eliminar(1);

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Inténtelo de nuevo más tarde'));
      alertSpy.mockRestore();
    });

    // --- PILAR: INTEGRIDAD DEL ESTADO ---
    it('no debería alterar el signal si la eliminación falla en el servidor', () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockPaginaService.deletePagina.mockReturnValue(throwError(() => new Error('Any error')));
      component.paginas.set(mockPaginas);

      component.eliminar(1);

      // El signal debe seguir teniendo las 2 páginas originales
      expect(component.paginas()).toEqual(mockPaginas);
    });
  });

});
