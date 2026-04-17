import {TestBed} from '@angular/core/testing';
import {Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree} from '@angular/router';
import {authGuard} from './auth.guard';
import {AuthService} from '../services/auth';
import {signal} from '@angular/core';
import {describe, it, expect, beforeEach, vi} from 'vitest';

describe('authGuard', () => {
  // Mocks de las dependencias
  const mockAuthService = {
    userRole: signal<string | null>(null)
  };

  const mockRouter = {
    // El guard usa parseUrl, así que lo mockeamos para que devuelva un objeto similar a UrlTree
    parseUrl: vi.fn((url: string) => ({toString: () => url} as UrlTree))
  } as unknown as Router;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        {provide: AuthService, useValue: mockAuthService},
        {provide: Router, useValue: mockRouter}
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

  describe('Validación de Negocio (El Portero)', () => {

    // 1. CAMINO FELIZ: Acceso concedido
    it('debería permitir el acceso (true) cuando el servicio confirma un rol de usuario', () => {
      // Configuramos el estado: El usuario es un 'USER' válido
      mockAuthService.userRole.set('USER');

      const result = executeGuard();

      // Validación de Negocio: El acceso debe ser true
      expect(result).toBe(true);
      // Integridad: No debe haber intento de redirección
      expect(mockRouter.parseUrl).not.toHaveBeenCalled();
    });

    // 2. CAMINO FELIZ: Acceso administrativo
    it('debería permitir el acceso (true) cuando el rol es administrativo', () => {
      mockAuthService.userRole.set('ADMIN');

      const result = executeGuard();

      expect(result).toBe(true);
    });

    // 3. CASO DE BORDE / SANITIZACIÓN: String vacío
    it('debería denegar el acceso si el rol es un string vacío (falsy)', () => {
      // Escenario: El servicio devuelve "" por un error de carga o datos sucios
      mockAuthService.userRole.set('');

      const result = executeGuard();

      // Validación de Negocio: "" no es un rol válido, debe fallar
      expect(result.toString()).toBe('/login');
    });

    // 4. ROBUSTEZ: Usuario no autenticado (null)
    it('debería denegar el acceso y redirigir si el rol es nulo', () => {
      mockAuthService.userRole.set(null);

      const result = executeGuard();

      // El Guard debe cumplir su función de seguridad redirigiendo al login
      expect(result.toString()).toBe('/login');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    });
  });

  describe('Validación de Negocio (Seguridad de Acceso)', () => {

    // 1. CAMINO FELIZ: Usuario estándar
    it('debería permitir el acceso cuando el servicio confirma un rol de USER', () => {
      // Configuramos el estado del negocio
      mockAuthService.userRole.set('USER');

      const result = executeGuard();

      // Validación: El acceso debe ser concedido
      expect(result).toBe(true);
      // Integridad: No debe intentar redirigir si el acceso es válido
      expect(mockRouter.parseUrl).not.toHaveBeenCalled();
    });

    // 2. CAMINO FELIZ: Usuario administrador
    it('debería permitir el acceso cuando el servicio confirma un rol de ADMIN', () => {
      mockAuthService.userRole.set('ADMIN');

      const result = executeGuard();

      expect(result).toBe(true);
    });

    // 3. CASO DE BORDE / SANITIZACIÓN: El "Falsy" peligroso
    it('debería denegar el acceso si el rol es un string vacío', () => {
      // Escenario de datos sucios: el signal tiene un valor pero no es contenido útil
      mockAuthService.userRole.set('');

      const result = executeGuard();

      // Validación de Negocio: "" no es un permiso válido, debe redirigir
      expect(result.toString()).toBe('/login');
    });

    // 4. ROBUSTEZ: Estado inicial / No autenticado
    it('debería denegar el acceso y redirigir a /login si el rol es null', () => {
      mockAuthService.userRole.set(null);

      const result = executeGuard();

      // Verificamos la protección de la ruta
      expect(result.toString()).toBe('/login');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    });
  });

  describe('Integridad y Efectos Secundarios', () => {

    // 1. INTEGRIDAD: Función Pura (No modificación)
    it('no debería alterar el valor del rol en el AuthService al realizar la comprobación', () => {
      // Definimos el valor de entrada
      const valorEsperado = 'ADMIN';
      mockAuthService.userRole.set(valorEsperado);

      // Ejecutamos el guard (la acción)
      executeGuard();

      // PILAR DE INTEGRIDAD: Verificamos que el signal NO ha cambiado.
      // Usamos valorEsperado para asegurar que el Guard fue una función pura.
      expect(mockAuthService.userRole()).toBe(valorEsperado);
    });

    // 2. INTEGRIDAD DE REDIRECCIÓN: Consistencia del destino
    it('debería asegurar que la redirección apunte exactamente a /login sin parámetros extra extraños', () => {
      mockAuthService.userRole.set(null);

      const result = executeGuard();

      // Verificamos que la integridad de la ruta de escape es absoluta
      expect(result.toString()).toBe('/login');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/login');
    });

    // 3. ROBUSTEZ: Estabilidad ante llamadas múltiples
    it('debería ser consistente y devolver el mismo resultado si se consulta varias veces seguidas', () => {
      mockAuthService.userRole.set('USER');

      const primeraConsulta = executeGuard();
      const segundaConsulta = executeGuard();

      // Integridad: El comportamiento debe ser determinista
      expect(primeraConsulta).toBe(true);
      expect(segundaConsulta).toBe(true);
    });
  });

  describe('Robustez y Casos de Borde Finales', () => {

    // 1. ROBUSTEZ: Tipos de datos inesperados (Defensa en profundidad)
    it('debería denegar el acceso si el rol no es un string (ej. un objeto o número)', () => {
      // Escenario: El backend o un error de mapeo devuelve algo que no es un string
      // @ts-ignore - Forzamos el caso de borde
      mockAuthService.userRole.set({ admin: true });

      const result = executeGuard();

      // Aunque sea un objeto "truthy", el Guard debe ser estricto o fallar hacia la seguridad
      // En tu implementación actual 'if (authService.userRole())' dejaría pasar objetos.
      // Este test detectará si necesitas una validación más específica como typeof === 'string'
      expect(result.toString()).toBe('/login');
    });

    // 2. CASO DE BORDE: Espacios en blanco (Sanitización)
    it('debería denegar el acceso si el rol son solo espacios en blanco', () => {
      mockAuthService.userRole.set('   '); // Datos sucios

      const result = executeGuard();

      // Un rol de solo espacios no debe dar acceso
      expect(result.toString()).toBe('/login');
    });

    // 3. PROTECCIÓN DE RE-ENTRADA: Estado de sesión expirada
    it('debería re-evaluar correctamente y denegar el acceso si el rol pasa de tener valor a ser null', () => {
      // 1. El usuario estaba logueado
      mockAuthService.userRole.set('USER');
      expect(executeGuard()).toBe(true);

      // 2. La sesión expira o el usuario hace logout
      mockAuthService.userRole.set(null);

      const result = executeGuard();

      // Integridad de flujo: El guard debe detectar el cambio de estado inmediatamente
      expect(result.toString()).toBe('/login');
    });
  });

});
