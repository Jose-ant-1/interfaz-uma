import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('authGuard', () => {
  // Mocks de las dependencias
  const mockAuthService = {
    userRole: signal<string | null>(null)
  };

  const mockRouter = {
    // El guard usa parseUrl, así que lo mockeamos para que devuelva un objeto similar a UrlTree
    parseUrl: vi.fn((url: string) => ({ toString: () => url } as UrlTree))
  } as unknown as Router;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  // Función helper para ejecutar el guard dentro del contexto de inyección de Angular
  const executeGuard = () => {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  };

  it('debería crearse la referencia correctamente', () => {
    expect(authGuard).toBeTruthy();
  });

  describe('Lógica de Acceso (Los 4 Pilares)', () => {

    // 1. CAMINO FELIZ
    it('debería retornar true si el usuario tiene un rol (está autenticado)', () => {
      // Simulamos que hay un rol (da igual cuál, mientras no sea null)
      mockAuthService.userRole.set('USER');

      const result = executeGuard();

      expect(result).toBe(true);
      expect(mockRouter.parseUrl).not.toHaveBeenCalled();
    });

    // 2. CASO DE BORDE / FALLO
    it('debería retornar un UrlTree a /login si el rol es null (no autenticado)', () => {
      // Simulamos que no hay sesión
      mockAuthService.userRole.set(null);

      const result = executeGuard();

      // Verificamos que devuelve la redirección (Pilar 2)
      expect(result.toString()).toBe('/login');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería denegar el acceso si el rol es una cadena vacía (falsy)', () => {
      // Un string vacío "" es falsy en JS/TS, el Guard debería tratarlo como no autenticado
      mockAuthService.userRole.set('');

      const result = executeGuard();

      expect(result.toString()).toBe('/login');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    });

    // 4. INTEGRIDAD (Efectos secundarios)
    it('no debería alterar el estado del rol del usuario al realizar la comprobación', () => {
      const rolInicial = 'ADMIN';
      mockAuthService.userRole.set(rolInicial);

      executeGuard();

      // El Guard debe ser una función pura: consultar, no modificar
      expect(mockAuthService.userRole()).toBe(rolInicial);
    });
  });

});
