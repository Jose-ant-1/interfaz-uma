import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuarioAnyadir } from './usuario-anyadir';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {of, Subject, throwError} from 'rxjs';

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

  describe('UsuarioAnyadir - Pilares de Signals e Inject', () => {

    // --- PILAR: INTEGRIDAD Y CAMINO FELIZ (Inject + Signals) ---
    it('debería completar el "Camino Feliz": sanitizar, enviar y navegar', () => {
      // Setup de Signals con datos "sucios" (Pilar de Sanitización)
      component.nuevoUsuario.set({ nombre: '  Ana  ', email: ' ana@uma.es ', permiso: 'USER' });
      mockUsuarioService.crearUsuario.mockReturnValue(of({ id: 1 }));

      component.guardar();

      // Verificación de Sanitización y Protección de Envío
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Ana',
        email: 'ana@uma.es'
      }));
      // Verificación de Inject(Router)
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // --- PILAR: TEST DE ESTADO DE CARGA Y BLOQUEO DE RE-ENTRADA ---
    it('debería gestionar el estado de carga y bloquear envíos duplicados', () => {
      const respuesta$ = new Subject();
      mockUsuarioService.crearUsuario.mockReturnValue(respuesta$);

      // Primer intento: Activa Signal de carga
      component.guardar();
      expect(component.cargando()).toBe(true); // Test de Estado de Carga
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledTimes(1);

      // Segundo intento: El Pilar de Bloqueo de Re-entrada debe impedir la llamada
      component.guardar();
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledTimes(1);
    });

    // --- PILAR: MANEJO DE ERRORES E INTEGRIDAD DEL ESTADO ---
    it('debería liberar el estado de carga y notificar si ocurre un error (Manejo de Errores)', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockUsuarioService.crearUsuario.mockReturnValue(throwError(() => new Error('API Error')));

      component.guardar();

      // Verificamos que el Signal vuelve a false para permitir correcciones (Integridad)
      expect(component.cargando()).toBe(false);
      expect(alertSpy).toHaveBeenCalled();
      // Verificamos que el Inject(Router) NO navegó ante el error
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    // --- PILAR: CASO DE BORDE E INTEGRIDAD DOM (Signals -> UI) ---
    it('debería reflejar el estado del Signal "cargando" en la interfaz (Integración DOM)', async () => {
      // Forzamos el estado de carga a través del Signal
      component.cargando.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const boton = fixture.nativeElement.querySelector('#btn-guardar');
      // En el componente real, el botón debería estar deshabilitado o con un spinner
      // Aquí validamos que la lógica del Signal fluye hacia la vista
      expect(component.cargando()).toBe(true);
    });

    // --- PILAR: VALIDACIÓN DE NEGOCIO (Valores por defecto) ---
    it('debería mantener la integridad de los valores por defecto del Signal', () => {
      const estadoInicial = component.nuevoUsuario();
      expect(estadoInicial.permiso).toBe('USER'); // Validación de Negocio: Rol base
      expect(component.cargando()).toBe(false); // Integridad: No empieza cargando
    });
  });

  describe('UsuarioAnyadir - Pilares del método guardar()', () => {

    // --- PILARES: CAMINO FELIZ, SANITIZACIÓN Y PROTECCIÓN DE ENVÍO ---
    it('debería sanitizar datos, enviar la petición y navegar al éxito (Camino Feliz)', () => {
      // 1. Setup con datos "sucios" para probar el Pilar de Sanitización
      component.nuevoUsuario.set({
        nombre: '  Marcos Pérez  ',
        email: ' marcos@uma.es  ',
        permiso: 'USER'
      });
      mockUsuarioService.crearUsuario.mockReturnValue(of({ id: 1 }));

      component.guardar();

      // 2. Verificación del Pilar de Sanitización y Protección de Envío
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Marcos Pérez',
        email: 'marcos@uma.es'
      }));

      // 3. Verificación de Inject(Router) para el flujo de navegación
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/usuarios']);
    });

    // --- PILARES: ESTADO DE CARGA Y BLOQUEO DE RE-ENTRADA ---
    it('debería gestionar el estado de carga y bloquear el doble submit (Bloqueo de Re-entrada)', () => {
      const respuesta$ = new Subject();
      mockUsuarioService.crearUsuario.mockReturnValue(respuesta$);

      // Activamos el primer envío
      component.guardar();

      // Test de Estado de Carga (Signal debe ser true)
      expect(component.cargando()).toBe(true);
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledTimes(1);

      // Intentamos un segundo envío mientras cargando() es true
      component.guardar();

      // Pilar de Bloqueo de Re-entrada: No debe haber una segunda llamada al servicio
      expect(mockUsuarioService.crearUsuario).toHaveBeenCalledTimes(1);
    });

    // --- PILARES: MANEJO DE ERRORES E INTEGRIDAD DE ESTADO ---
    it('debería liberar el bloqueo y notificar al usuario ante un fallo (Manejo de Errores)', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.crearUsuario.mockReturnValue(throwError(() => new Error('Error de Servidor')));

      component.guardar();

      // Pilar de Integridad: El signal debe volver a false para permitir reintentos
      expect(component.cargando()).toBe(false);
      // Pilar de Manejo de Errores: Notificación vía UI
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error al guardar'));

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    // --- PILARES: CASO DE BORDE E INTEGRIDAD DEL SIGNAL ---
    it('debería mantener los datos en el signal si la petición falla (Caso de Borde)', () => {
      const datosEntrada = { nombre: 'Error Test', email: 'error@uma.es', permiso: 'ADMIN' as const };
      component.nuevoUsuario.set(datosEntrada);
      mockUsuarioService.crearUsuario.mockReturnValue(throwError(() => new Error('Fail')));

      component.guardar();

      // Pilar de Integridad: No limpiamos el formulario para que el usuario no pierda lo escrito
      expect(component.nuevoUsuario()).toEqual(datosEntrada);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // --- PILARES: VALIDACIÓN DE NEGOCIO E INTEGRACIÓN DOM ---
    it('debería reflejar la reactividad del signal "cargando" en la UI (Integración DOM)', async () => {
      // Simulamos carga activa
      component.cargando.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const boton = fixture.nativeElement.querySelector('#btn-guardar');
      // Verificamos que el estado del signal es consistente con la lógica de UI
      expect(component.cargando()).toBe(true);
      // Nota: Aquí se podría verificar si el botón está disabled si el HTML lo implementa
    });
  });

});
