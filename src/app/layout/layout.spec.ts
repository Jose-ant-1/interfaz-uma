import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Layout } from './layout';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {CommonModule} from '@angular/common';

describe('LayoutComponent', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  // Mocks de dependencias
  const mockAuthService = {
    // Importante: userName y userRole deben ser signals para que el componente funcione
    userName: signal('Usuario Test'),
    userRole: signal('USER'),
    logout: vi.fn()
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      // 1. QUITAMOS 'Layout' de aquí para evitar que busque el HTML antes de tiempo
      imports: [RouterModule.forRoot([]), CommonModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    // 2. AHORA SÍ: Anulamos la carga del archivo HTML
    TestBed.overrideComponent(Layout, {
      set: {
        template: '<div></div>',
        templateUrl: undefined
      }
    });

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;

    // 3. Ejecutamos la detección inicial para procesar signals y computed
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Estado y Reactividad (Signals/Computed/Escape)', () => {

    // 1. CAMINO FELIZ: Signals y Computed
    it('debería calcular correctamente si el usuario es ADMIN', () => {
      // Cambiamos el signal del mock a ADMIN
      mockAuthService.userRole.set('ADMIN');

      // Forzamos que Angular recalcule el computed
      fixture.detectChanges();

      expect(component.esAdmin()).toBe(true);
      expect(component.userName()).toBe('Usuario Test');
    });

    // 2. CASO DE BORDE: Cambio de Rol
    it('debería actualizar esAdmin a false si el rol cambia a USER', () => {
      mockAuthService.userRole.set('USER');

      fixture.detectChanges();

      expect(component.esAdmin()).toBe(false);
    });

    // 3. MANEJO DE EVENTOS (onEscape)
    it('debería cerrar el menú cuando se pulsa la tecla Escape', () => {
      // Setup: Abrimos el menú primero
      component.menuAbierto.set(true);

      // Acción: Disparamos el evento de teclado que escucha el @HostListener
      component.onEscape();

      expect(component.menuAbierto()).toBe(false);
    });

    // 4. INTEGRIDAD: Seguridad del @HostListener
    it('no debería dar error ni cambiar nada al pulsar Escape si el menú ya estaba cerrado', () => {
      component.menuAbierto.set(false);

      component.onEscape();

      expect(component.menuAbierto()).toBe(false);
    });
  });

  describe('toggleMenu()', () => {
    // 1. CAMINO FELIZ
    it('debería cambiar el estado de false a true al ejecutarlo una vez', () => {
      // Setup: Nos aseguramos de que empiece cerrado
      component.menuAbierto.set(false);

      component.toggleMenu();

      // Verificación: El signal debe haber cambiado a true
      expect(component.menuAbierto()).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería cambiar de true a false si el menú ya estaba abierto', () => {
      // Setup: Forzamos estado abierto
      component.menuAbierto.set(true);

      component.toggleMenu();

      // Verificación: El signal debe haber vuelto a false
      expect(component.menuAbierto()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería mantener un estado booleano consistente tras múltiples clics rápidos', () => {
      // Simulamos 3 clics seguidos empezando en false: false -> true -> false -> true
      component.menuAbierto.set(false);

      component.toggleMenu(); // true
      component.toggleMenu(); // false
      component.toggleMenu(); // true

      expect(component.menuAbierto()).toBe(true);
    });

    // 4. INTEGRIDAD
    it('no debería afectar a los datos del usuario (nombre/rol) al cambiar el estado del menú', () => {
      // Guardamos valores iniciales
      const nombreInicial = component.userName();
      const rolInicial = component.userRole();

      component.toggleMenu();

      // Verificamos que el cambio de UI no toque la sesión del usuario
      expect(component.userName()).toBe(nombreInicial);
      expect(component.userRole()).toBe(rolInicial);
    });
  });

  describe('cerrarMenu()', () => {
    // 1. CAMINO FELIZ
    it('debería poner menuAbierto en false si el menú estaba abierto', () => {
      // Setup: Forzamos el estado a true
      component.menuAbierto.set(true);

      component.cerrarMenu();

      // Verificación: Debe ser false
      expect(component.menuAbierto()).toBe(false);
    });

    // 2. CASO DE BORDE
    it('debería mantener menuAbierto en false si ya estaba cerrado', () => {
      // Setup: Ya está en false
      component.menuAbierto.set(false);

      component.cerrarMenu();

      // Verificación: Sigue siendo false (no hay "toggle" accidental)
      expect(component.menuAbierto()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería asegurar que el estado sea estrictamente false y no dependa de valores previos', () => {
      // Ejecutamos varias veces seguidas
      component.menuAbierto.set(true);

      component.cerrarMenu();
      component.cerrarMenu();
      component.cerrarMenu();

      expect(component.menuAbierto()).toBe(false);
    });

    // 4. INTEGRIDAD
    it('no debería disparar la navegación ni el logout al cerrar el menú', () => {
      component.menuAbierto.set(true);

      component.cerrarMenu();

      // Verificamos que una acción de UI no toque la lógica de sesión
      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('cerrarSesion()', () => {
    // 1. CAMINO FELIZ
    it('debería ejecutar el logout y redirigir al login correctamente', () => {
      component.cerrarSesion();

      // Verificación de la llamada al servicio (Pilar 1)
      expect(mockAuthService.logout).toHaveBeenCalled();

      // Verificación de la redirección (Pilar 1)
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    // 2. CASO DE BORDE
    it('debería cerrar la sesión incluso si el menú lateral estaba abierto', () => {
      // Setup: Usuario con menú abierto
      component.menuAbierto.set(true);

      component.cerrarSesion();

      // El logout debe ocurrir independientemente del estado de la UI
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería asegurar que el logout se llame antes que la navegación por seguridad', () => {
      const logoutSpy = mockAuthService.logout;
      const navigateSpy = mockRouter.navigate;

      component.cerrarSesion();

      // Verificamos el orden lógico de ejecución
      const ordenLogout = logoutSpy.mock.invocationCallOrder[0];
      const ordenNavigate = navigateSpy.mock.invocationCallOrder[0];

      expect(ordenLogout).toBeLessThan(ordenNavigate);
    });

    // 4. INTEGRIDAD
    it('no debería realizar ninguna otra acción o petición al servidor aparte del logout', () => {
      // Limpiamos llamadas previas para ser precisos
      vi.clearAllMocks();

      component.cerrarSesion();

      // Solo esperamos estas dos interacciones
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      // Por ejemplo, no debería llamar a otros servicios si los hubiera
    });
  });

});
