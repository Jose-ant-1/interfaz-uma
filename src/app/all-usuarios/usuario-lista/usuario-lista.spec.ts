import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {UsuariosListComponent} from './usuario-lista';
import {UsuarioService} from '../../services/usuario.service';
import {delay, of, Subject, throwError} from 'rxjs';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {CommonModule} from '@angular/common';
import {Usuario} from '../../models/usuario.model';

describe('UsuariosListComponent', () => {
  let component: UsuariosListComponent;
  let fixture: ComponentFixture<UsuariosListComponent>;

  const mockUsuarioService = {
    getUsuarios: vi.fn(),
    buscarUsuarios: vi.fn(),
    eliminarUsuario: vi.fn()
  };

  const mockUsuarios: any[] = [
    {id: 1, nombre: 'Admin', email: 'admin@uma.es'},
    {id: 2, nombre: 'User', email: 'user@uma.es'}
  ];

  const crearFixtureConTemplate = async (template: string) => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [{ provide: UsuarioService, useValue: mockUsuarioService }]
    }).overrideComponent(UsuariosListComponent, {
      set: {
        template,
        templateUrl: undefined,
        imports: [CommonModule], // Quitamos UsuarioCardComponent de aquí
        schemas: [] // Esto ayuda a ignorar etiquetas desconocidas si hiciera falta
      }
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosListComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mocks por defecto
    mockUsuarioService.getUsuarios.mockReturnValue(of(mockUsuarios));
    mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));
    mockUsuarioService.eliminarUsuario.mockReturnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [{ provide: UsuarioService, useValue: mockUsuarioService }]
    }).overrideComponent(UsuariosListComponent, {
      set: {
        template: '<div></div>',
        templateUrl: undefined,
        imports: [CommonModule]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosListComponent);
    component = fixture.componentInstance;

    // FORZAMOS LA CARGA INICIAL
    fixture.detectChanges(); // Esto lanza ngOnInit -> cargarUsuarios()
    vi.advanceTimersByTime(0); // Procesa microtareas
  });

  afterEach(() => {
    vi.useRealTimers(); // Limpiamos los timers
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
      // Como detectChanges ya se llamó en el beforeEach,
      // solo verificamos que el servicio ya fue consultado
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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      });
      mockUsuarioService.getUsuarios.mockReturnValue(throwError(() => new Error('Error de servidor')));

      component.ngOnInit();

      expect(component.cargando()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Error al cargar usuarios", expect.anything());
    });

    // 4. INTEGRIDAD: Suscripción del buscador
    it('debería tener el buscador$ listo para reaccionar a cambios', async () => {
      fixture.detectChanges(); // Ejecuta ngOnInit
      const termino = 'pedro';

      const evento = { target: { value: termino } } as any;
      component.onSearch(evento);

      // Avanzamos el tiempo de Vitest manualmente
      vi.advanceTimersByTime(300);

      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledWith(termino);
    });

    // 5. PILAR: INTEGRIDAD DE INYECTABLES Y SIGNALS
    it('debería asegurar que las dependencias inyectadas (UsuarioService) están operativas', () => {
      // Validación de Negocio: El componente no debe arrancar si el servicio es nulo
      // @ts-ignore - Accedemos a la propiedad privada para auditoría de integridad
      expect(component.usuarioService).toBeDefined();
    });

// 6. PILAR: ROBUSTEZ (Estado de Carga) - CORREGIDO
    it('debería mantener el signal "cargando" en true mientras la petición está pendiente', () => {
      // Usamos un Subject para controlar exactamente cuándo responde el servidor
      const respuestaManual = new Subject<Usuario[]>();
      mockUsuarioService.getUsuarios.mockReturnValue(respuestaManual.asObservable());

      component.cargarUsuarios();

      // Validación: El pilar de interfaz exige que el spinner sea visible mientras no hay datos
      expect(component.cargando()).toBe(true);

      // Cerramos el flujo para limpiar el test
      respuestaManual.next([]);
      expect(component.cargando()).toBe(false);
    });

    // 7. PILAR: INTEGRACIÓN DOM (Caso @empty) - CORREGIDO
    it('debería mostrar el mensaje de "No se encontraron usuarios" en el DOM si la lista está vacía', async () => {
      // IMPORTANTE: En el template del test usamos un div simple en lugar de <app-usuario-card>
      // para evitar problemas de dependencias de componentes hijos.
      const template = `
        <div>
          @for (u of usuarios(); track u.id) {
            <div class="user-item">{{ u.nombre }}</div>
          } @empty {
            <div id="empty-msg">No hay usuarios</div>
          }
        </div>
      `;

      const fixtureDom = await crearFixtureConTemplate(template);

      // Forzamos estado vacío
      fixtureDom.componentInstance.usuarios.set([]);
      fixtureDom.detectChanges();

      const msg = fixtureDom.nativeElement.querySelector('#empty-msg');

      // Verificación de Integridad de Interfaz
      expect(msg).toSatisfy((el: HTMLElement) => el !== null);
      expect(msg.textContent).toContain('No hay usuarios');
    });
  });

  describe('onSearch() - Pilares de Reactividad y Flujo', () => {

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // 1. PILAR: PROTECCIÓN DE ENVÍO (Debounce)
    it('debería ignorar ráfagas de escritura y solo llamar al servicio una vez (Debounce)', () => {
      mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));

      // El usuario escribe "A", luego "Ad", luego "Admin" muy rápido
      component.onSearch({ target: { value: 'A' } } as any);
      vi.advanceTimersByTime(100);
      component.onSearch({ target: { value: 'Ad' } } as any);
      vi.advanceTimersByTime(100);
      component.onSearch({ target: { value: 'Admin' } } as any);

      // Aún no han pasado los 300ms totales desde el último cambio
      expect(mockUsuarioService.buscarUsuarios).not.toHaveBeenCalled();

      // Avanzamos el resto del tiempo
      vi.advanceTimersByTime(300);
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledTimes(1);
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledWith('Admin');
    });

    // 2. PILAR: SANITIZACIÓN (DistinctUntilChanged)
    it('no debería re-lanzar la búsqueda si el término es idéntico al anterior', () => {
      mockUsuarioService.buscarUsuarios.mockReturnValue(of([]));

      // Buscamos "Admin"
      component.onSearch({ target: { value: 'Admin' } } as any);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      // Buscamos "Admin" otra vez (quizás pegó lo mismo)
      component.onSearch({ target: { value: 'Admin' } } as any);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      // Pilar de Integridad: No malgastamos recursos de red
      expect(mockUsuarioService.buscarUsuarios).toHaveBeenCalledTimes(1);
    });

    // 3. PILAR: INTEGRIDAD DE FLUJO (SwitchMap / Race Condition)
    it('debería cancelar la petición anterior si llega una nueva búsqueda (SwitchMap)', () => {
      // Creamos un observable que tarda en responder
      const peticionLenta = of([{ id: 1, nombre: 'Lento' }]).pipe(delay(1000));
      const peticionRapida = of([{ id: 2, nombre: 'Rápido' }]);

      mockUsuarioService.buscarUsuarios
        .mockReturnValueOnce(peticionLenta)
        .mockReturnValueOnce(peticionRapida);

      // Primera búsqueda
      component.onSearch({ target: { value: 'Lento' } } as any);
      vi.advanceTimersByTime(300); // Pasa el debounce
      fixture.detectChanges();
      // Segunda búsqueda inmediata
      component.onSearch({ target: { value: 'Rápido' } } as any);
      vi.advanceTimersByTime(300); // Pasa el debounce
      fixture.detectChanges();
      // El signal de usuarios debe tener el valor de la SEGUNDA búsqueda
      // SwitchMap garantiza que la primera "se tira a la basura"
      expect(component.usuarios()).toEqual([{ id: 2, nombre: 'Rápido' }]);
    });

    // 4. PILAR: RESILIENCIA (Error Handling en el Stream)
    it('debería seguir funcionando aunque una búsqueda devuelva error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // La primera falla
      mockUsuarioService.buscarUsuarios.mockReturnValueOnce(throwError(() => new Error('DB Error')));
      // La segunda funciona
      mockUsuarioService.buscarUsuarios.mockReturnValueOnce(of([{ id: 3, nombre: 'Resucitado' }]));

      component.onSearch({ target: { value: 'Fallo' } } as any);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      component.onSearch({ target: { value: 'Exito' } } as any);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      // Si el stream no tiene catchError o el subscribe está mal, el buscador moriría.
      // Aquí validamos que el flujo sigue vivo.
      expect(component.usuarios()).toEqual([{ id: 3, nombre: 'Resucitado' }]);
    });
  });

  describe('cargarUsuarios()', () => {

    // 1. CAMINO FELIZ
    it('debería actualizar el signal usuarios y poner cargando en false al recibir datos', () => {
      // Setup: Definimos qué devolverá el servicio
      const nuevosUsuarios = [{id: 99, nombre: 'Nuevo', email: 'nuevo@uma.es'}];
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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      });
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

    // 5. RPBUSTEZ
    it('debería mantener los usuarios actuales si una nueva carga falla (Pilar de Robustez)', () => {
      // 1. Datos previos COMPLETOS según el modelo Usuario
      const datosPrevios: Usuario[] = [
        { id: 1, nombre: 'Existente', email: 'test@uma.es' }
      ];
      component.usuarios.set(datosPrevios);

      // 2. Intentamos recargar pero falla
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.getUsuarios.mockReturnValue(throwError(() => new Error('Fallo')));

      component.cargarUsuarios();

      // Verificación
      expect(component.usuarios()).toEqual(datosPrevios);
      expect(component.cargando()).toBe(false);
    });

    // 6. PROTECCIÓN DE ENVÍO
    it('debería resetear explícitamente el estado de carga al iniciar (Pilar de Protección de Interfaz)', () => {
      // Nos aseguramos de que el primer paso sea poner cargando a true
      // Usamos un observable que no emite para capturar el estado intermedio
      mockUsuarioService.getUsuarios.mockReturnValue(new Subject().asObservable());

      component.cargando.set(false);
      component.cargarUsuarios();

      expect(component.cargando()).toBe(true);
    });

    // 7. INTEGRACIÓN DOM
    it('debería mostrar físicamente un indicador de carga en el DOM mientras cargando es true', async () => {
      // Simulamos el bloque de carga de tu HTML
      const template = `
        @if (cargando()) { <div id="spinner">Cargando...</div> }
        @else { <div id="lista">Lista lista</div> }
      `;
      const fixtureDom = await crearFixtureConTemplate(template);

      // Act: Iniciamos carga
      fixtureDom.componentInstance.cargando.set(true);
      fixtureDom.detectChanges();

      const spinner = fixtureDom.nativeElement.querySelector('#spinner');
      expect(spinner).toBeTruthy();
      expect(fixtureDom.nativeElement.querySelector('#lista')).toBeNull();
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
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {
      });
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

    // 5. PROTECCIÓN DE ENVÍO
    it('debería impedir múltiples peticiones de eliminación si una ya está en curso (Pilar de Protección de Envío)', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      // Simulamos una respuesta lenta del servidor
      const respuestaLenta = new Subject<void>();
      mockUsuarioService.eliminarUsuario.mockReturnValue(respuestaLenta.asObservable());

      // Primer intento
      component.eliminarUsuario(1);
      // Segundo intento inmediato (sin esperar al primero)
      component.eliminarUsuario(1);

      // Verificación: Solo se debe haber llamado una vez al servicio
      expect(mockUsuarioService.eliminarUsuario).toHaveBeenCalledTimes(1);
    });

    // 6. ROBUSTEZ
    it('no debería alterar la lista si el ID a eliminar no existe en el signal local (Pilar de Robustez)', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUsuarioService.eliminarUsuario.mockReturnValue(of(null));
      const longitudInicial = component.usuarios().length;

      // Intentamos borrar un ID fantasma (999)
      component.eliminarUsuario(999);

      // Verificación: La lista sigue igual, no hay errores de undefined
      expect(component.usuarios().length).toBe(longitudInicial);
    });

    // 7. INTEGRIDAD DE FLUJO
    it('debería asegurar que la lista de usuarios se actualiza exactamente DESPUÉS de recibir el OK del servidor (Pilar de Integridad de Flujo)', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const respuestaManual = new Subject<void>();
      mockUsuarioService.eliminarUsuario.mockReturnValue(respuestaManual.asObservable());

      component.eliminarUsuario(1);

      // Antes de que el servidor responda, el usuario 1 sigue ahí
      expect(component.usuarios().find(u => u.id === 1)).toBeTruthy();

      // El servidor responde
      respuestaManual.next();

      // Ahora sí ha desaparecido
      expect(component.usuarios().find(u => u.id === 1)).toBeUndefined();
    });

  });


});
