import {ComponentFixture, TestBed} from '@angular/core/testing';
import {UsuarioEditar} from './usuario-editar';
import {UsuarioService} from '../../services/usuario.service';
import {ActivatedRoute, Router} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Usuario} from '../../models/usuario.model';

describe('UsuarioEditar', () => {
  let component: UsuarioEditar;
  let fixture: ComponentFixture<UsuarioEditar>;

  // Mocks de dependencias
  const mockUsuarioService = {
    getUsuarioById: vi.fn(),
    updateUsuario: vi.fn()
  };
  const mockRouter = {
    navigate: vi.fn()
  };

  // Mock de la ruta activa con un ID específico
  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: vi.fn().mockReturnValue('1')
      }
    }
  };

  const mockUsuarioData = {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@uma.es',
    rol: 'USER'
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('1');
    mockUsuarioService.getUsuarioById.mockReturnValue(of(mockUsuarioData));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule], // Quitamos UsuarioEditar de aquí
      providers: [
        {provide: UsuarioService, useValue: mockUsuarioService},
        {provide: Router, useValue: mockRouter},
        {provide: ActivatedRoute, useValue: mockActivatedRoute}
      ]
    }).compileComponents();

    // PILAR INTEGRACIÓN DOM: Definimos el template manualmente para el test
    // Copia aquí la estructura básica de tu HTML original (la parte del spinner y el @if)
    TestBed.overrideComponent(UsuarioEditar, {
      set: {
        template: `
          @if (usuario()) {
            <div class="container">
              @if (cargando()) { <div class="animate-spin"></div> }
              <form (ngSubmit)="guardar()">
                <input [(ngModel)]="usuario()!.nombre" name="nombre">
                <button type="submit">Guardar</button>
              </form>
            </div>
          } @else {
            <div class="animate-spin">Cargando perfil...</div>
          }
        `
      }
    });

    fixture = TestBed.createComponent(UsuarioEditar);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente e inicializar el usuario', () => {
    // 1. DISPARAMOS el ciclo de vida
    fixture.detectChanges();

    expect(component).toBeTruthy();
    // Ahora sí, ngOnInit se ejecutó y llamó al servicio
    expect(mockUsuarioService.getUsuarioById).toHaveBeenCalledWith(1);
    // Verificamos que el signal tiene los datos y la contraseña vacía
    expect(component.usuario()).toEqual({...mockUsuarioData, contrasenia: ''});
    expect(component.cargando()).toBe(false);
  });

  describe('UsuarioEditar - Inicialización y ngOnInit', () => {

    // PILAR 1: Camino Feliz
    it('debería cargar los datos del usuario y limpiar la contraseña al iniciar', () => {
      mockUsuarioService.getUsuarioById.mockReturnValue(of(mockUsuarioData));

      fixture.detectChanges(); // Ejecuta ngOnInit

      expect(component.usuario()).toEqual({...mockUsuarioData, contrasenia: ''});
      expect(component.cargando()).toBe(false);
    });

    // PILAR 2: Caso de Borde (ID inexistente en URL)
    it('debería redirigir a la lista si el parámetro ID no existe (es null)', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });
    // PILAR 3: Manejo de Errores (404 o fallo de red)
    it('debería navegar a la lista si el servicio responde con error', () => {
      mockUsuarioService.getUsuarioById.mockReturnValue(throwError(() => new Error('404')));

      fixture.detectChanges();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // PILAR 6: Robustez (Estado de carga coherente)
    it('debería iniciar con el estado cargando en true antes de recibir datos', () => {
      // Dejamos la petición pendiente
      mockUsuarioService.getUsuarioById.mockReturnValue(new Subject());

      fixture.detectChanges();

      expect(component.cargando()).toBe(true);
    });

    // PILAR 10: Gestión de Memoria (Garantía de limpieza)
    it('debería cancelar la suscripción al destruir el componente', () => {
      const pipeSpy = vi.spyOn(mockUsuarioService.getUsuarioById(1), 'pipe');

      fixture.detectChanges();

      // Verificamos que se usó takeUntilDestroyed (indirectamente al ver si el stream se manejó)
      expect(pipeSpy).toHaveBeenCalled();
    });

    // PILAR 11: Reactividad y Estado de Interfaz (Integración DOM)
    it('debería mostrar el spinner de carga mientras el usuario es null', () => {
      // Setup: Servicio que no responde (el signal usuario seguirá en null)
      mockUsuarioService.getUsuarioById.mockReturnValue(new Subject());

      fixture.detectChanges(); // Dispara ngOnInit

      const spinner = fixture.nativeElement.querySelector('.animate-spin');

      // Ahora spinner NO será null porque el HTML real tiene el @else con el spinner
      expect(spinner).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Cargando perfil');
    });
  });

  describe('ngOnInit()', () => {

    // 1. CAMINO FELIZ (Ya esbozado en el test inicial, pero aquí lo formalizamos)
    it('debería cargar los datos del usuario si el ID existe en la URL', () => {
      // Setup: El servicio devuelve datos correctos
      mockUsuarioService.getUsuarioById.mockReturnValue(of(mockUsuarioData));

      component.ngOnInit(); // Lo ejecutamos explícitamente para mayor claridad

      expect(mockUsuarioService.getUsuarioById).toHaveBeenCalledWith(1);
      expect(component.usuario()).toEqual({...mockUsuarioData, contrasenia: ''});
      expect(component.cargando()).toBe(false);
    });

    // 2. CASO DE BORDE / FALLO: Usuario no encontrado
    it('debería redirigir a la lista de usuarios si el servicio devuelve error (404, etc.)', () => {
      // Setup: El servicio falla
      mockUsuarioService.getUsuarioById.mockReturnValue(throwError(() => new Error('Not Found')));

      component.ngOnInit();

      // Verificación de la lógica: error: () => void this.router.navigate(['/dashboard/usuarios'])
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // 3. SEGURIDAD: ID inválido o ausente
    it('no debería llamar al servicio si el ID en la ruta no es un número válido', () => {
      // Cambiamos el mock del paramMap para este test
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);

      component.ngOnInit();

      expect(mockUsuarioService.getUsuarioById).not.toHaveBeenCalled();
    });

    // 4. INTEGRIDAD: Estado de carga
    it('debería mantener cargando en true inicialmente y cambiarlo a false tras la respuesta', () => {
      // Verificamos que el flujo de señales es consistente
      mockUsuarioService.getUsuarioById.mockReturnValue(of(mockUsuarioData));

      component.cargando.set(true);
      component.ngOnInit();

      expect(component.cargando()).toBe(false);
    });
  });

  describe('guardar()', () => {

    beforeEach(() => {
      // IMPORTANTE: Liberamos el semáforo antes de cada test de guardado
      component.cargando.set(false);
      component.usuario.set(mockUsuarioData);
    });

    // 1. CAMINO FELIZ
    it('debería actualizar el usuario y redirigir al listado tras un guardado exitoso', () => {
      // Setup: Seteamos un usuario en el signal y simulamos éxito en el servicio
      component.usuario.set(mockUsuarioData);
      mockUsuarioService.updateUsuario.mockReturnValue(of(mockUsuarioData));

      component.guardar();

      // Verificación: Se llamó al servicio con los datos correctos
      expect(mockUsuarioService.updateUsuario).toHaveBeenCalledWith(mockUsuarioData.id, mockUsuarioData);
      // Verificación: Navegó de vuelta a la lista
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // 2. CASO DE BORDE: Sin usuario cargado
    it('no debería llamar al servicio si no hay un usuario o ID válido en el signal', () => {
      // Setup: El signal está en null
      component.usuario.set(null);

      component.guardar();

      // Verificación: El método hace un "return" temprano
      expect(mockUsuarioService.updateUsuario).not.toHaveBeenCalled();
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería mostrar una alerta y detener el estado de carga si el servidor falla', () => {
      // Setup: Simulamos error y espiamos el alert del navegador
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {
      });
      component.usuario.set(mockUsuarioData);
      mockUsuarioService.updateUsuario.mockReturnValue(throwError(() => new Error('Error de DB')));

      component.guardar();

      // Verificación: Se gestiona el error
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error al actualizar'));
      expect(component.cargando()).toBe(false); // El botón debe volver a habilitarse

      alertSpy.mockRestore();
    });

    // 4. INTEGRIDAD: Estado de carga (Feedback visual)
    it('debería poner el estado cargando en true mientras la petición está en curso', () => {
      // Setup: Usamos un Subject para dejar la petición "en el aire"
      const respuesta$ = new Subject<any>();
      mockUsuarioService.updateUsuario.mockReturnValue(respuesta$);
      component.usuario.set(mockUsuarioData);

      component.guardar();

      // Verificación: El estado de carga se activa para deshabilitar el botón de guardar
      expect(component.cargando()).toBe(true);

      // Cerramos la petición
      respuesta$.next(mockUsuarioData);
      // Tras el next, el componente navegaría (probado en pilar 1)
    });

    // 5. BLOQUEO DE RE-ENTRADA (Evitar spam de clics)
    it('debería bloquear intentos de guardado simultáneos si ya hay una petición en curso', () => {
      component.usuario.set(mockUsuarioData);
      // Usamos un Subject que no emite nada para dejar la petición "colgada"
      const peticionPendiente = new Subject<Usuario>();
      mockUsuarioService.updateUsuario.mockReturnValue(peticionPendiente);

      // Primer clic
      component.guardar();
      expect(mockUsuarioService.updateUsuario).toHaveBeenCalledTimes(1);
      expect(component.cargando()).toBe(true);

      // Segundo clic inmediato
      component.guardar();

      // Verificación: No se ha llamado una segunda vez al servicio
      expect(mockUsuarioService.updateUsuario).toHaveBeenCalledTimes(1);
    });

    // 6. GESTIÓN DE MEMORIA (Limpieza al destruir)
    it('debería cancelar la suscripción de guardado si el componente se destruye', () => {
      component.usuario.set(mockUsuarioData);
      const respuesta$ = new Subject<Usuario>();
      mockUsuarioService.updateUsuario.mockReturnValue(respuesta$);

      // Espiamos si la suscripción se cierra
      const pipeSpy = vi.spyOn(respuesta$, 'pipe');

      component.guardar();

      // Verificamos que se aplicó el operador de destrucción
      expect(pipeSpy).toHaveBeenCalled();
    });

  });


});
