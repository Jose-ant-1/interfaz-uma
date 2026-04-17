import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuarioAnyadir } from './usuario-anyadir';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('UsuarioAnyadir', () => {
  let component: UsuarioAnyadir;
  let fixture: ComponentFixture<UsuarioAnyadir>;

  // 1. MOCKS: Definimos los espías para el servicio y el router
  const mockUsuarioService = {
    crearUsuario: vi.fn()
  };
  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // 1. PRIMERO redefinimos el componente (IMPORTANTE: antes de configurar el módulo)
    TestBed.overrideComponent(UsuarioAnyadir, {
      set: {
        template: `
          <form (ngSubmit)="guardar()">
            <input [(ngModel)]="nuevoUsuario().nombre" name="nombre">
            <button type="submit" id="btn-guardar">Guardar</button>
          </form>
        `,
        templateUrl: undefined,
        styleUrls: [],
        imports: [CommonModule, FormsModule]
      }
    });

    // 2. AHORA configuramos el módulo, pero SIN importar el componente aquí
    // si lo hemos sobreescrito arriba, Angular ya lo tiene en memoria.
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule], // Solo módulos necesarios
      providers: [
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    // 3. CREAMOS la instancia
    fixture = TestBed.createComponent(UsuarioAnyadir);
    component = fixture.componentInstance;

    // 4. DETECCIÓN inicial para que el FormsModule procese el template
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // --- PRUEBAS DE BASE (COBERTURA INICIAL) ---

  it('debería crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el nuevoUsuario con valores por defecto', () => {
    const defaultUser = component.nuevoUsuario();
    expect(defaultUser.nombre).toBe('');
    expect(defaultUser.permiso).toBe('USER');
    expect(defaultUser.email).toBe('');
  });

  it('debería actualizar el Signal cuando se cambian los datos (Simulando el Form)', () => {
    // Los signals se pueden actualizar directamente en el test
    component.nuevoUsuario.set({
      nombre: 'Nuevo Test',
      email: 'test@uma.es',
      permiso: 'ADMIN'
    });

    expect(component.nuevoUsuario().nombre).toBe('Nuevo Test');
    expect(component.nuevoUsuario().permiso).toBe('ADMIN');
  });

  describe('guardar()', () => {

    // 1. CAMINO FELIZ: Creación exitosa y redirección
    it('debería llamar a crearUsuario y navegar al dashboard tras un éxito', () => {
      // Setup
      const datosNuevos = { nombre: 'Nuevo User', email: 'test@uma.es', permiso: 'USER' };
      component.nuevoUsuario.set(datosNuevos);
      mockUsuarioService.crearUsuario.mockReturnValue(of({ id: 100, ...datosNuevos }));

      // Acción
      component.guardar();

      // Verificación
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledWith(datosNuevos);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // 2. CASO DE BORDE: Datos mínimos o campos vacíos
    it('debería permitir guardar incluso con datos parciales (si el servicio lo acepta)', () => {
      // Setup: Solo enviamos el nombre, simulando que el resto está por defecto
      const datosParciales = { nombre: 'Solo Nombre', email: '', permiso: 'USER' };
      component.nuevoUsuario.set(datosParciales);
      mockUsuarioService.crearUsuario.mockReturnValue(of({ id: 101 }));

      component.guardar();

      expect(mockUsuarioService.crearUsuario).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    // 3. MANEJO DE ERRORES: Error de servidor (Duplicados, etc.)
    it('debería mostrar una alerta y registrar el error si la creación falla', () => {
      // Setup
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.crearUsuario.mockReturnValue(throwError(() => new Error('Email duplicado')));

      // Acción
      component.guardar();

      // Verificación
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error al guardar'));
      expect(consoleSpy).toHaveBeenCalled();

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    // 4. INTEGRIDAD: Consistencia del Signal
    it('no debería limpiar el signal nuevoUsuario si la petición falla', () => {
      // Setup: Llenamos el signal
      const datosOriginales = { nombre: 'No Borrar', email: 'error@uma.es' };
      component.nuevoUsuario.set(datosOriginales);
      mockUsuarioService.crearUsuario.mockReturnValue(throwError(() => new Error('Server Error')));

      // Acción
      component.guardar();

      // Verificación: El usuario no pierde lo que había escrito para poder corregirlo
      expect(component.nuevoUsuario().nombre).toBe('No Borrar');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Estado de Interfaz y DOM (UI/UX)', () => {

    beforeEach(() => {
      vi.spyOn(window, 'alert').mockImplementation(() => {
      });
    });

    it('debería llamar al método guardar() cuando se hace click en el botón', async () => {
      // 1. IMPORTANTE: Preparamos el mock para que devuelva un observable vacío
      // Así, cuando el componente haga .subscribe(), no fallará.
      mockUsuarioService.crearUsuario.mockReturnValue(of({}));

      const guardarSpy = vi.spyOn(component, 'guardar');

      fixture.detectChanges();
      await fixture.whenStable();

      const boton = fixture.nativeElement.querySelector('#btn-guardar');
      expect(boton).not.toBeNull();

      // 2. Al hacer click, se ejecuta la lógica completa
      boton.click();

      expect(guardarSpy).toHaveBeenCalled();
      // También verificamos que el servicio fue llamado
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalled();
    });

    it('debería reflejar cambios del Signal en el valor del input (Data Binding)', async () => {
      // Actualizamos el signal
      component.nuevoUsuario.set({
        nombre: 'Angular 21',
        email: 'test@uma.es',
        permiso: 'USER'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('input[name="nombre"]');

      expect(input).not.toBeNull();
      expect(input.value).toBe('Angular 21');
    });
  });

  describe('Robustez y Seguridad (Protección avanzada)', () => {

    beforeEach(() => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    // 1. TEST DE PROTECCIÓN DE ENVÍO
    it('debería enviar exactamente los datos que contiene el signal y no otros', () => {
      const datosInyectados = { nombre: 'Seguridad', email: 'sec@uma.es', permiso: 'ADMIN' as const };
      component.nuevoUsuario.set(datosInyectados);
      mockUsuarioService.crearUsuario.mockReturnValue(of({ id: 1 }));

      component.guardar();

      // Verificamos que no se filtran propiedades extra o datos corruptos
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledWith(datosInyectados);
    });

    // 2. TEST DE ESTADO DE CARGA (Simulando latencia)
    it('debería manejar correctamente el tiempo de espera del servidor', async () => {
      // Usamos un Subject para controlar cuándo responde el servidor
      const respuestaLenta = new Subject();
      mockUsuarioService.crearUsuario.mockReturnValue(respuestaLenta.asObservable());

      component.guardar();

      // En este punto el servicio ha sido llamado pero no ha respondido
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      // Simulamos que el servidor responde 1 segundo después
      respuestaLenta.next({ id: 99 });
      respuestaLenta.complete();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // 3. TEST DE BLOQUEO DE RE-ENTRADA (Evitar doble submit)
    it('no debería realizar múltiples llamadas si el usuario pulsa el botón repetidamente', () => {
      const crearSpy = mockUsuarioService.crearUsuario.mockReturnValue(new Subject()); // Nunca responde

      // Simulamos 3 clics rápidos
      component.guardar();
      component.guardar();
      component.guardar();

      // Nota: Si este test falla (sale 3), significa que deberías añadir
      // un flag de 'cargando' en tu componente para deshabilitar el botón.
      expect(crearSpy).toHaveBeenCalledTimes(1);
    });

    // 4. TEST DE SANITIZACIÓN (Lógica de negocio previa al envío)
    it('debería limpiar espacios en blanco de los campos antes de enviar', () => {
      component.nuevoUsuario.set({
        nombre: '  Juan Pérez  ',
        email: '  juan@uma.es  ',
        permiso: 'USER'
      });
      mockUsuarioService.crearUsuario.mockReturnValue(of({ id: 1 }));

      component.guardar();

      // Este test fallará si no tienes lógica de .trim() en tu componente.
      // Es excelente para detectar que necesitas limpiar los datos antes de la API.
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Juan Pérez',
        email: 'juan@uma.es'
      }));
    });
  });

});
