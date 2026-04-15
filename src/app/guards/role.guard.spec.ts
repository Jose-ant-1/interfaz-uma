import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('roleGuard', () => {
  // Mocks de dependencias
  const mockAuthService = {
    userRole: signal<string | null>(null)
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de localStorage para evitar efectos secundarios en el navegador real
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  // Helper para ejecutar el guard en contexto de inyección
  const executeGuard = () => {
    return TestBed.runInInjectionContext(() =>
      roleGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  };

  it('debería crearse la referencia correctamente', () => {
    expect(roleGuard).toBeTruthy();
  });

  describe('Lógica de Autorización (Los 4 Pilares)', () => {

    // 1. CAMINO FELIZ
    it('debería permitir el acceso si el AuthService confirma que es ADMIN', () => {
      // Setup: El servicio tiene el rol correcto
      mockAuthService.userRole.set('ADMIN');

      const result = executeGuard();

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // 2. CASOS DE BORDE (LocalStorage)
    it('debería permitir el acceso si el rol ADMIN está en LocalStorage aunque no esté en el servicio', () => {
      // Setup: Servicio vacío pero LocalStorage con datos
      mockAuthService.userRole.set(null);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('ADMIN');

      const result = executeGuard();

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debería denegar acceso y redirigir si el rol es USER', () => {
      // Setup: Usuario logueado pero sin permisos de admin
      mockAuthService.userRole.set('USER');

      const result = executeGuard();

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería denegar el acceso si no hay ninguna información de rol disponible', () => {
      // Setup: Todo vacío (null)
      mockAuthService.userRole.set(null);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const result = executeGuard();

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    // 4. INTEGRIDAD
    it('debería priorizar el valor del AuthService sobre el del LocalStorage', () => {
      // Caso crítico: El servicio dice que eres USER (actualizado)
      // pero el LocalStorage dice ADMIN (antiguo/cacheado)
      mockAuthService.userRole.set('USER');
      const storageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('ADMIN');

      const result = executeGuard();

      // Debería fallar porque el servicio (verdad única) dice USER
      // Nota: Según tu código `authService.userRole() || localStorage.getItem('userRole')`
      // si userRole() devuelve 'USER', es truthy y no llega al localStorage.
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });


});
