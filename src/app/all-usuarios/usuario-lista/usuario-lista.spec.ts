import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UsuariosListComponent } from './usuario-lista';
import { UsuarioService } from '../../services/usuario.service';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonModule } from '@angular/common';

describe('UsuariosListComponent', () => {
  let component: UsuariosListComponent;
  let fixture: ComponentFixture<UsuariosListComponent>;

  const mockUsuarioService = {
    getUsuarios: vi.fn(),
    buscarUsuarios: vi.fn(),
    eliminarUsuario: vi.fn()
  };

  const mockUsuarios: any[] = [
    { id: 1, nombre: 'Admin', email: 'admin@uma.es' },
    { id: 2, nombre: 'User', email: 'user@uma.es' }
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUsuarioService.getUsuarios.mockReturnValue(of(mockUsuarios));
    mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      // 1. QUITAMOS UsuariosListComponent de aquí
      imports: [CommonModule],
      providers: [
        { provide: UsuarioService, useValue: mockUsuarioService }
      ]
    }).compileComponents();

    // 2. AHORA SÍ: Anulamos el acceso al archivo físico .html
    TestBed.overrideComponent(UsuariosListComponent, {
      set: {
        template: '<div></div>',
        templateUrl: undefined,
        imports: [CommonModule]
      }
    });

    fixture = TestBed.createComponent(UsuariosListComponent);
    component = fixture.componentInstance;

    // 3. ngOnInit se dispara aquí
    fixture.detectChanges();
  });

  it('debería crearse correctamente y cargar usuarios iniciales', () => {
    expect(component).toBeTruthy();
    // Esto ya prueba el ngOnInit de UsuariosListComponent
    expect(mockUsuarioService.getUsuarios).toHaveBeenCalled();
    expect(component.usuarios()).toEqual(mockUsuarios);
    expect(component.cargando()).toBe(false);
  });

  describe('ngOnInit() y Carga Inicial', () => {

    // 1. CAMINO FELIZ
    it('debería llamar a cargarUsuarios y configurar el buscador al iniciar', () => {
      // El spy de cargarUsuarios nos permite ver si se llamó
      const cargarSpy = vi.spyOn(component, 'cargarUsuarios');

      component.ngOnInit();

      // Verificamos que se dispara la carga inicial de la tabla
      expect(cargarSpy).toHaveBeenCalled();
      expect(mockUsuarioService.getUsuarios).toHaveBeenCalled();
    });

    // 2. CASO DE BORDE: El servicio devuelve lista vacía
    it('debería inicializar usuarios como un array vacío si el servicio no trae datos', () => {
      mockUsuarioService.getUsuarios.mockReturnValue(of([]));

      component.ngOnInit();

      expect(component.usuarios()).toEqual([]);
      expect(component.cargando()).toBe(false);
    });

    // 3. MANEJO DE ERRORES (SEGURIDAD)
    it('debería manejar el error del servicio y detener el estado de carga', () => {
      // Mockeamos console.error para que no ensucie la terminal del test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.getUsuarios.mockReturnValue(throwError(() => new Error('Error de servidor')));

      component.ngOnInit();

      expect(component.cargando()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Error al cargar usuarios", expect.anything());
    });

    // 4. INTEGRIDAD: Suscripción del buscador
    it('debería tener el buscador$ listo para reaccionar a cambios tras el ngOnInit', async () => {
      vi.useFakeTimers();
      const termino = 'pedro';
      mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));

      // Ejecutamos ngOnInit para que se cree la suscripción al buscador$
      component.ngOnInit();

      // Simulamos una búsqueda
      const evento = { target: { value: termino } } as unknown as Event;
      component.onSearch(evento);

      vi.advanceTimersByTime(300);

      // Si el ngOnInit configuró bien el pipe, el servicio debe haber sido llamado
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledWith(termino);

      vi.useRealTimers();
    });
  });

  describe('onSearch() y Flujo de Búsqueda', () => {

    beforeEach(() => {
      // Activamos los cronómetros falsos de Vitest antes de cada test de este bloque
      vi.useFakeTimers();
    });

    afterEach(() => {
      // Volvemos a los cronómetros reales para no afectar a otros archivos
      vi.useRealTimers();
    });

    // 1. CAMINO FELIZ
    it('debería emitir el término y actualizar la lista tras el debounceTime', async () => {
      const termino = 'Admin';
      const resultadosMock = [mockUsuarios[0]];
      mockUsuarioService.buscarUsuarios.mockReturnValue(of(resultadosMock));

      const evento = { target: { value: termino } } as unknown as Event;
      component.onSearch(evento);

      // Adelantamos 300ms manualmente
      vi.advanceTimersByTime(300);

      // Verificamos
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledWith(termino);
      expect(component.usuarios()).toEqual(resultadosMock);
    });

    // 2. CASO DE BORDE: Término vacío
    it('debería buscar con string vacío si el input se limpia', async () => {
      mockUsuarioService.buscarUsuarios.mockReturnValue(of(mockUsuarios));

      const evento = { target: { value: '' } } as unknown as Event;
      component.onSearch(evento);

      vi.advanceTimersByTime(300);

      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledWith('');
      expect(component.usuarios()).toEqual(mockUsuarios);
    });

    // 3. SEGURIDAD: Evitar llamadas duplicadas (distinctUntilChanged)
    it('no debería llamar al servicio si el término de búsqueda es el mismo', async () => {
      mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));
      const evento = { target: { value: 'test' } } as unknown as Event;

      component.onSearch(evento);
      vi.advanceTimersByTime(300);

      component.onSearch(evento);
      vi.advanceTimersByTime(300);

      // Solo una llamada a pesar de intentarlo dos veces con el mismo texto
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledTimes(1);
    });

    // 4. INTEGRIDAD: Debounce (Escritura rápida)
    it('debería cancelar búsquedas previas si el usuario escribe rápido', async () => {
      mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));
      const evento1 = { target: { value: 'Ad' } } as unknown as Event;
      const evento2 = { target: { value: 'Admin' } } as unknown as Event;

      component.onSearch(evento1);
      vi.advanceTimersByTime(150); // No llega al debounce

      component.onSearch(evento2);
      vi.advanceTimersByTime(300); // Aquí sí salta

      // Solo se llama con el valor final
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledTimes(1);
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledWith('Admin');
    });
  });

  describe('cargarUsuarios()', () => {

    // 1. CAMINO FELIZ
    it('debería actualizar el signal usuarios y poner cargando en false al recibir datos', () => {
      // Setup: Definimos qué devolverá el servicio
      const nuevosUsuarios = [{ id: 99, nombre: 'Nuevo', email: 'nuevo@uma.es' }];
      mockUsuarioService.getUsuarios.mockReturnValue(of(nuevosUsuarios));

      component.cargarUsuarios();

      // Verificación: Los signals deben reflejar la realidad del servicio
      expect(component.usuarios()).toEqual(nuevosUsuarios);
      expect(component.cargando()).toBe(false);
    });

    // 2. CASO DE BORDE: Lista vacía
    it('debería manejar correctamente una respuesta vacía del servidor', () => {
      mockUsuarioService.getUsuarios.mockReturnValue(of([]));

      component.cargarUsuarios();

      expect(component.usuarios()).toEqual([]);
      expect(component.cargando()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería detener el estado de carga (cargando = false) incluso si el servicio falla', () => {
      // Setup: Forzamos un error de red
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.getUsuarios.mockReturnValue(throwError(() => new Error('Fallo de conexión')));

      component.cargarUsuarios();

      // Verificación: No debe quedarse en "loading" infinito si falla
      expect(component.cargando()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });

    // 4. INTEGRIDAD
    it('debería llamar al servicio exactamente una vez por cada ejecución', () => {
      mockUsuarioService.getUsuarios.mockReturnValue(of(mockUsuarios));

      component.cargarUsuarios();
      component.cargarUsuarios();

      // Verificamos que no hay llamadas fantasmales o bucles
      // +1 de la carga inicial en el beforeEach = 3
      expect(mockUsuarioService.getUsuarios).toHaveBeenCalledTimes(3);
    });
  });

  describe('eliminarUsuario()', () => {

    // 1. CAMINO FELIZ
    it('debería eliminar al usuario de la lista si el usuario confirma y el servicio responde OK', () => {
      const idAEliminar = 1;
      // Simulamos que el usuario hace clic en "Aceptar" en el cuadro de diálogo
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUsuarioService.eliminarUsuario.mockReturnValue(of(null));

      component.eliminarUsuario(idAEliminar);

      // Verificación: Se llamó al servicio con el ID correcto
      expect(mockUsuarioService.eliminarUsuario).toHaveBeenCalledWith(idAEliminar);
      // Verificación: El signal se actualizó eliminando solo a ese usuario
      expect(component.usuarios().length).toBe(1);
      expect(component.usuarios().find(u => u.id === idAEliminar)).toBeUndefined();
      confirmSpy.mockRestore();
    });

    // 2. CASO DE BORDE: Cancelación
    it('no debería hacer nada si el usuario cancela el diálogo de confirmación', () => {
      // Simulamos que el usuario hace clic en "Cancelar"
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      component.eliminarUsuario(1);

      // No se debe llamar al servicio ni cambiar la lista
      expect(mockUsuarioService.eliminarUsuario).not.toHaveBeenCalled();
      expect(component.usuarios().length).toBe(2);
      confirmSpy.mockRestore();
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería mostrar una alerta y no modificar la lista si el servidor falla', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockUsuarioService.eliminarUsuario.mockReturnValue(throwError(() => new Error('Error al borrar')));

      component.eliminarUsuario(1);

      // La lista debe permanecer intacta si la operación en el servidor falló
      expect(component.usuarios().length).toBe(2);
      expect(alertSpy).toHaveBeenCalledWith('Hubo un error al intentar eliminar al usuario.');
      alertSpy.mockRestore();
    });

    // 4. INTEGRIDAD
    it('no debería afectar a otros usuarios al eliminar uno específico', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUsuarioService.eliminarUsuario.mockReturnValue(of(null));
      const usuarioQueSeQueda = mockUsuarios[1]; // El ID 2

      component.eliminarUsuario(1);

      // El usuario 2 debe seguir existiendo en el Signal
      expect(component.usuarios()).toContainEqual(usuarioQueSeQueda);
    });
  });


});
