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

  describe('Pilar: Validación de Negocio (Control de Acceso VIP)', () => {

    // 1. CAMINO FELIZ: Acceso por Servicio
    it('debería permitir acceso (true) si el AuthService confirma rol ADMIN', () => {
      mockAuthService.userRole.set('ADMIN');

      const result = executeGuard();

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // 2. CAMINO FELIZ: Acceso por Persistencia (LocalStorage)
    it('debería permitir acceso (true) si el servicio es null pero localStorage tiene ADMIN', () => {
      mockAuthService.userRole.set(null);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('ADMIN');

      const result = executeGuard();

      expect(result).toBe(true);
    });

    // 3. NEGOCIO: Denegación por Rol Insuficiente
    it('debería denegar acceso (false) si el rol es USER', () => {
      mockAuthService.userRole.set('USER');

      const result = executeGuard();

      expect(result).toBe(false);
      // PILAR: INTEGRIDAD DE INTERFAZ - Redirección forzosa
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    // 4. ROBUSTEZ: Sensibilidad a Mayúsculas (Case Sensitivity)
    it('debería denegar el acceso si el rol es "admin" (en minúsculas)', () => {
      // El contrato de negocio suele ser en mayúsculas. Probamos robustez.
      mockAuthService.userRole.set('admin');

      const result = executeGuard();

      // Si el código no hace .toUpperCase(), esto debería fallar (redirigir)
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    // 5. SANITIZACIÓN: Roles con espacios
    it('debería denegar el acceso si el rol en localStorage tiene espacios " ADMIN "', () => {
      mockAuthService.userRole.set(null);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(' ADMIN ');

      const result = executeGuard();

      // Pilar de Sanitización: Un string sucio no debe validar como ADMIN
      expect(result).toBe(false);
    });
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

  describe('Pilar: Integridad de Flujo (Coherencia de Navegación)', () => {

    // 1. INTEGRIDAD DE LA REDIRECCIÓN
    it('debería ejecutar una navegación "agresiva" a la ruta de monitoreos si falla la validación', () => {
      mockAuthService.userRole.set('USER');

      const result = executeGuard();

      // Integridad: El resultado debe ser false para cancelar la ruta actual
      expect(result).toBe(false);
      // Efecto secundario: Debe disparar la redirección configurada
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    // 2. INTEGRIDAD DE LA FUENTE (Verdad Única)
    it('debería ignorar el localStorage si el AuthService tiene un rol definido (aunque sea USER)', () => {
      // Escenario: El servicio dice que eres USER (verdad actual)
      // El localStorage tiene un resto de una sesión anterior como ADMIN
      mockAuthService.userRole.set('USER');
      const storageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('ADMIN');

      const result = executeGuard();

      // Integridad: La memoria viva (Signal) debe mandar sobre la persistencia
      expect(result).toBe(false);
      expect(storageSpy).not.toHaveBeenCalled(); // Si el servicio tiene valor, no debería ni mirar el storage
    });

    // 3. RESILIENCIA: Estado de Carga / Indeterminado
    it('debería bloquear el flujo y redirigir si tanto el servicio como el storage devuelven null', () => {
      mockAuthService.userRole.set(null);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const result = executeGuard();

      // Integridad: Ante el vacío absoluto, la aplicación no debe quedarse colgada
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });
  });

  describe('Pilar: Robustez y Casos de Borde (Blindaje)', () => {

    // 1. SANITIZACIÓN: Espacios y Mayúsculas en LocalStorage
    it('debería denegar el acceso si el localStorage tiene el rol " admin " (sucio)', () => {
      mockAuthService.userRole.set(null);
      // Simulamos un valor guardado con espacios o en minúsculas
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(' admin ');

      const result = executeGuard();

      // Robustez: La comparación literal 'ADMIN' fallará, lo cual es correcto por seguridad
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    // 2. CASO DE BORDE: El "null" como cadena de texto
    it('debería denegar el acceso si el localStorage tiene guardado el string "null"', () => {
      mockAuthService.userRole.set(null);
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('null'); // Error común de persistencia

      const result = executeGuard();

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    // 3. ROBUSTEZ: Caracteres especiales o roles inexistentes
    it('debería denegar acceso ante roles no contemplados (ej. "SUPERUSER")', () => {
      mockAuthService.userRole.set('SUPERUSER');

      const result = executeGuard();

      // Validación de Negocio: Si no es EXACTAMENTE 'ADMIN', no pasa
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });



});
