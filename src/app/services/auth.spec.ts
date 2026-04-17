import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {Usuario} from '../models/usuario.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Limpiamos localStorage antes de cada test para evitar interferencias
    localStorage.clear();
    // Reiniciamos los signals del servicio para que no arrastren estado
    service.logout();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated()', () => {

    // 1. CAMINO FELIZ
    it('debería retornar true si existen authData y userRole válidos', () => {
      localStorage.setItem('authData', 'Bearer token123');
      service.userRole.set('ADMIN');

      expect(service.isAuthenticated()).toBe(true);
    });

    // 2. CASO DE BORDE (Estado parcial)
    it('debería retornar false si el token existe pero el signal de rol es null', () => {
      localStorage.setItem('authData', 'Bearer token123');
      service.userRole.set(null);

      expect(service.isAuthenticated()).toBe(false);
    });

    // 3. MANEJO DE ERRORES (Consistencia de datos)
    it('debería retornar false si authData es un string vacío', () => {
      localStorage.setItem('authData', ''); // Caso de corrupción de storage
      service.userRole.set('USER');

      expect(service.isAuthenticated()).toBe(false);
    });

    // 4. INTEGRIDAD (Doble validación)
    it('debería retornar false si falta el token aunque el rol esté presente', () => {
      localStorage.removeItem('authData');
      service.userRole.set('USER');

      expect(service.isAuthenticated()).toBe(false);
    });

    // 5. VALIDACIÓN DE NEGOCIO (Persistencia) - NUEVO
    it('debería ser consistente con el estado real del localStorage tras un borrado', () => {
      // Simulamos login
      localStorage.setItem('authData', 'token');
      service.userRole.set('ADMIN');
      expect(service.isAuthenticated()).toBe(true);

      // Simulamos borrado externo o manual
      localStorage.removeItem('authData');

      expect(service.isAuthenticated()).toBe(false);
    });

    // 6. ROBUSTEZ (Sincronía de Signals) - NUEVO
    it('debería reaccionar correctamente si el signal de rol cambia a null', () => {
      localStorage.setItem('authData', 'token');
      service.userRole.set('ADMIN');

      // Cambio de estado reactivo
      service.userRole.set(null);

      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('login()', () => {
    const mockEmail = 'test@uma.es';
    const mockPass = '123456';
    const loginEndpoint = '/usuarios/login';
    const meEndpoint = '/usuarios/me';

    // 1. CAMINO FELIZ (Flujo completo encadenado)
    it('debería realizar login, guardar token y obtener datos del usuario con tipado correcto', () => {
      const mockToken = { token: 'xyz123' };
      const mockUser: Usuario = { id: 1, nombre: 'Pepe', email: 'pepe@test.com', permiso: 'ADMIN' };

      // ✅ SIN DEPRECATED Y CON TIPADO: Usamos objeto observador
      service.login(mockEmail, mockPass).subscribe({
        next: (user: Usuario) => {
          expect(user.nombre).toBe('Pepe');
          expect(localStorage.getItem('authData')).toBe('Bearer xyz123');
          expect(service.userRole()).toBe('ADMIN');
        }
      });

      httpMock.expectOne(loginEndpoint).flush(mockToken);
      httpMock.expectOne(meEndpoint).flush(mockUser);
    });

    // 2. CASO DE BORDE (Mapeo de datos incompletos)
    it('debería asignar valores de seguridad (USER) si el perfil viene incompleto', () => {
      const mockUserIncompleto = { id: 1, email: 'test@test.com' };

      // ✅ SIN DEPRECATED: Se pasa un objeto Observer y se tipa el parámetro
      service.login(mockEmail, mockPass).subscribe({
        next: (user: Usuario) => {
          expect(user.permiso).toBe('USER');
          expect(user.nombre).toBe('Usuario');
          expect(service.userRole()).toBe('USER');
        }
      });

      httpMock.expectOne(loginEndpoint).flush({ token: 't' });
      httpMock.expectOne(meEndpoint).flush(mockUserIncompleto);
    });

    // 3. MANEJO DE ERRORES (Limpieza Atómica)
    it('debería ejecutar logout y limpiar storage si falla cualquier parte del flujo', () => {
      const spyLogout = vi.spyOn(service, 'logout');

      service.login(mockEmail, mockPass).subscribe({
        error: () => {
          expect(spyLogout).toHaveBeenCalled();
          expect(localStorage.getItem('authData')).toBeNull();
          expect(service.userRole()).toBeNull();
        }
      });

      // Fallo en la primera petición (Login)
      httpMock.expectOne(loginEndpoint).flush('Error', { status: 401, statusText: 'Unauthorized' });
    });

    // 4. INTEGRIDAD TÉCNICA (Sanitización y Estructura)
    it('debería enviar el email con trim y usar el método POST para el login', () => {
      service.login('  sucio@test.com  ', mockPass).subscribe();

      const req = httpMock.expectOne(loginEndpoint);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.email).toBe('sucio@test.com');

      req.flush({ token: 't' });
      httpMock.expectOne(meEndpoint).flush({ id: 1 });
    });

    // 5. VALIDACIÓN DE NEGOCIO (Sincronía Signals-Storage)
    it('debería persistir los datos en localStorage y Signals simultáneamente', () => {
      service.login(mockEmail, mockPass).subscribe();

      httpMock.expectOne(loginEndpoint).flush({ token: 't' });
      httpMock.expectOne(meEndpoint).flush({ id: 99, nombre: 'Admin', permiso: 'ROOT' });

      // Verificamos "el espejo": Signal vs LocalStorage
      expect(service.userName()).toBe('Admin');
      expect(localStorage.getItem('userName')).toBe('Admin');

      expect(service.userId()).toBe('99');
      expect(localStorage.getItem('userId')).toBe('99');
    });

    // 6. ROBUSTEZ (Estado de Latencia / Flujo Intermedio)
    it('debería guardar el token inmediatamente tras el primer paso del flujo', () => {
      service.login(mockEmail, mockPass).subscribe();

      // Flush de la primera petición
      httpMock.expectOne(loginEndpoint).flush({ token: 'token_paso_1' });

      // En este punto, el switchMap está esperando a /me, pero el token ya debe existir
      expect(localStorage.getItem('authData')).toBe('Bearer token_paso_1');

      // Cerramos la petición pendiente para limpiar el controlador
      httpMock.expectOne(meEndpoint).flush({ id: 1 });
    });
  });

  describe('logout()', () => {

    // 1. CAMINO FELIZ: Verificamos la limpieza atómica
    it('debería limpiar todos los datos de sesión y resetear signals simultáneamente', () => {
      // Setup
      localStorage.setItem('authData', 'Bearer token');
      localStorage.setItem('userRole', 'ADMIN');
      service.userRole.set('ADMIN');

      service.logout();

      expect(localStorage.getItem('authData')).toBeNull();
      expect(localStorage.getItem('userRole')).toBeNull();
      expect(service.userRole()).toBeNull();
    });

    // 2. CASO DE BORDE: Idempotencia (Logout doble)
    it('debería ser seguro llamar a logout múltiples veces sin lanzar errores', () => {
      service.logout();
      expect(() => service.logout()).not.toThrow();
    });

    // 3. MANEJO DE ERRORES: Consistencia de estado
    it('debería asegurar que isAuthenticated() es false inmediatamente tras el logout', () => {
      localStorage.setItem('authData', 'token');
      service.userRole.set('USER');

      expect(service.isAuthenticated()).toBe(true);
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
    });

    // 4. INTEGRIDAD: Precisión quirúrgica
    it('no debería borrar llaves del localStorage que no pertenecen a la autenticación', () => {
      localStorage.setItem('theme', 'dark'); // Llave ajena
      localStorage.setItem('authData', 'token');

      service.logout();

      expect(localStorage.getItem('theme')).toBe('dark'); // Se mantiene
      expect(localStorage.getItem('authData')).toBeNull(); // Se borra
    });
  });

  describe('actualizarDatosTrasCambio()', () => {
    const nuevoEmail = 'nuevo@uma.es';
    const nuevoNombre = 'Nuevo Nombre';

    // 1. CAMINO FELIZ: Verificación de la sincronía básica
    it('debería actualizar el signal de nombre y el localStorage correctamente', () => {
      service.actualizarDatosTrasCambio(nuevoEmail, nuevoNombre);

      expect(service.userName()).toBe(nuevoNombre);
      expect(localStorage.getItem('userName')).toBe(nuevoNombre);
    });

    // 2. CASO DE BORDE: Sanitización extrema (Pilar 5)
    it('debería aplicar trim y manejar valores null/undefined transformándolos en "Usuario"', () => {
      // @ts-ignore: Probando robustez ante fallos de tipado en runtime
      service.actualizarDatosTrasCambio(null, '   Juan Perez   ');

      expect(service.userName()).toBe('Juan Perez');
      expect(localStorage.getItem('userName')).toBe('Juan Perez');
    });

    // 3. MANEJO DE ERRORES: Prevención de inconsistencia
    it('debería asignar un nombre por defecto si se intenta guardar un string vacío', () => {
      service.actualizarDatosTrasCambio('', '   ');

      expect(service.userName()).toBe('Usuario');
      expect(localStorage.getItem('userName')).toBe('Usuario');
    });

    // 4. INTEGRIDAD: Aislamiento de estado (Pilar 4)
    it('debería actualizar el nombre sin alterar el Token ni el Rol del usuario', () => {
      // Setup de estado previo
      localStorage.setItem('authData', 'Bearer token_intacto');
      localStorage.setItem('userRole', 'ADMIN');
      service.userRole.set('ADMIN');

      service.actualizarDatosTrasCambio(nuevoEmail, 'Nuevo Nombre');

      // Verificamos que lo crítico no se ha tocado
      expect(localStorage.getItem('authData')).toBe('Bearer token_intacto');
      expect(service.userRole()).toBe('ADMIN');

      // Verificamos que lo nuevo se aplicó
      expect(service.userName()).toBe('Nuevo Nombre');
    });
  });

});
