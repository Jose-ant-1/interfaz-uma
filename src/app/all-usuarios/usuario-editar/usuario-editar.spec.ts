import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuarioEditar } from './usuario-editar';
import { UsuarioService } from '../../services/usuario.service';
import { ActivatedRoute, Router } from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

    // Configuramos mocks por defecto pero NO detectamos cambios todavía
    mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('1');
    mockUsuarioService.getUsuarioById.mockReturnValue(of(mockUsuarioData));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    TestBed.overrideComponent(UsuarioEditar, {
      set: { template: '<div></div>', templateUrl: undefined }
    });

    fixture = TestBed.createComponent(UsuarioEditar);
    component = fixture.componentInstance;
    // IMPORTANTE: Hemos quitado fixture.detectChanges() de aquí
  });

  it('debería crearse correctamente e inicializar el usuario', () => {
    // 1. DISPARAMOS el ciclo de vida
    fixture.detectChanges();

    expect(component).toBeTruthy();
    // Ahora sí, ngOnInit se ejecutó y llamó al servicio
    expect(mockUsuarioService.getUsuarioById).toHaveBeenCalledWith(1);
    // Verificamos que el signal tiene los datos y la contraseña vacía
    expect(component.usuario()).toEqual({ ...mockUsuarioData, contrasenia: '' });
    expect(component.cargando()).toBe(false);
  });

  describe('ngOnInit()', () => {

    // 1. CAMINO FELIZ (Ya esbozado en el test inicial, pero aquí lo formalizamos)
    it('debería cargar los datos del usuario si el ID existe en la URL', () => {
      // Setup: El servicio devuelve datos correctos
      mockUsuarioService.getUsuarioById.mockReturnValue(of(mockUsuarioData));

      component.ngOnInit(); // Lo ejecutamos explícitamente para mayor claridad

      expect(mockUsuarioService.getUsuarioById).toHaveBeenCalledWith(1);
      expect(component.usuario()).toEqual({ ...mockUsuarioData, contrasenia: '' });
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
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
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
  });

});
