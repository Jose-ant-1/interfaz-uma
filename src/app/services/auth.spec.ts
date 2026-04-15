import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
    it('debería retornar true si existen authData y userRole en localStorage', () => {
      localStorage.setItem('authData', 'Bearer token123');
      localStorage.setItem('userRole', 'ADMIN');

      // Actualizamos el signal manualmente para el test
      service.userRole.set('ADMIN');

      expect(service.isAuthenticated()).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería retornar false si authData existe pero userRole es null', () => {
      localStorage.setItem('authData', 'Bearer token123');
      service.userRole.set(null); // Caso donde se limpió el rol pero no el token

      expect(service.isAuthenticated()).toBe(false);
    });

    // 3. MANEJO DE ERRORES (Consistencia)
    it('debería retornar false si los datos en localStorage están vacíos o corruptos', () => {
      localStorage.setItem('authData', '');
      service.userRole.set(null);

      expect(service.isAuthenticated()).toBe(false);
    });

    // 4. INTEGRIDAD
    it('debería verificar la integridad comprobando ambos valores simultáneamente', () => {
      // Solo uno de los dos no basta
      localStorage.setItem('userRole', 'USER');
      service.userRole.set('USER');
      expect(service.isAuthenticated()).toBe(false); // Falla porque falta authData
    });
  });

  describe('login()', () => {
    const mockEmail = 'test@uma.es';
    const mockPass = '123456';
    const loginEndpoint = '/usuarios/login';
    const meEndpoint = '/usuarios/me';

    // 1. CAMINO FELIZ (Flujo completo POST + GET)
    it('debería realizar login, guardar token y obtener datos del usuario', () => {
      const mockToken = { token: 'xyz123' };
      const mockUser = { id: 1, nombre: 'Pepe', permiso: 'ADMIN' };

      service.login(mockEmail, mockPass).subscribe(user => {
        expect(user.nombre).toBe('Pepe');
        expect(localStorage.getItem('authData')).toBe('Bearer xyz123');
        expect(service.userRole()).toBe('ADMIN');
      });

      // Petición 1: Login
      const reqLogin = httpMock.expectOne(loginEndpoint);
      expect(reqLogin.request.method).toBe('POST');
      reqLogin.flush(mockToken);

      // Petición 2: /me (disparada por el switchMap)
      const reqMe = httpMock.expectOne(meEndpoint);
      expect(reqMe.request.method).toBe('GET');
      reqMe.flush(mockUser);
    });

    // 2. CASO DE BORDE: Login con espacios en el email
    it('debería hacer trim al email antes de enviarlo', () => {
      service.login('  espacios@test.com  ', mockPass).subscribe();

      const req = httpMock.expectOne(loginEndpoint);
      expect(req.request.body.email).toBe('espacios@test.com');
      req.flush({ token: 't' });
      httpMock.expectOne(meEndpoint).flush({});
    });

    // 3. MANEJO DE ERRORES: Error 401 y limpieza de datos
    it('debería limpiar datos y lanzar error si la autenticación falla', () => {
      const spyLogout = vi.spyOn(service, 'logout');

      service.login(mockEmail, mockPass).subscribe({
        next: () => expect.fail('No debería haber entrado aquí'),
        error: (err) => {
          expect(err.status).toBe(401);
          expect(spyLogout).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne(loginEndpoint);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    // 4. INTEGRIDAD: Persistencia en Signals
    it('debería actualizar los signals de la aplicación tras un login exitoso', () => {
      service.login(mockEmail, mockPass).subscribe();

      httpMock.expectOne(loginEndpoint).flush({ token: 't' });
      httpMock.expectOne(meEndpoint).flush({ id: 99, nombre: 'Admin', permiso: 'ROOT' });

      expect(service.userName()).toBe('Admin');
      expect(service.userId()).toBe('99');
    });
  });

  describe('logout()', () => {
    // 1. CAMINO FELIZ
    it('debería limpiar todos los datos de sesión y resetear el estado', () => {
      // Setup: simulamos una sesión activa
      localStorage.setItem('authData', 'Bearer token');
      localStorage.setItem('userRole', 'ADMIN');
      localStorage.setItem('userName', 'Admin Usuario');
      localStorage.setItem('userId', '1');
      service.userRole.set('ADMIN');
      service.userName.set('Admin Usuario');
      service.userId.set('1');

      service.logout();

      // Comprobamos que localStorage está vacío
      expect(localStorage.getItem('authData')).toBeNull();
      expect(localStorage.getItem('userRole')).toBeNull();
      expect(localStorage.getItem('userName')).toBeNull();
      expect(localStorage.getItem('userId')).toBeNull();

      // Comprobamos que los signals se han reseteado
      expect(service.userRole()).toBeNull();
      expect(service.userName()).toBeNull();
      expect(service.userId()).toBeNull();
    });

    // 2. CASO DE BORDE
    it('debería poder ejecutarse de forma segura incluso si no hay una sesión activa', () => {
      localStorage.clear();
      service.logout(); // Ejecutar en frío

      expect(localStorage.length).toBe(0);
      expect(service.isAuthenticated()).toBe(false);
    });

    // 3. MANEJO DE ERRORES (Consistencia)
    it('debería asegurar que isAuthenticated() devuelve false inmediatamente tras el logout', () => {
      localStorage.setItem('authData', 'token');
      service.userRole.set('USER');

      expect(service.isAuthenticated()).toBe(true);

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
    });

    // 4. INTEGRIDAD
    it('debería limpiar específicamente solo las llaves relacionadas con auth y no otras', () => {
      localStorage.setItem('config_usuario', 'modo-oscuro');
      localStorage.setItem('authData', 'token');

      service.logout();

      expect(localStorage.getItem('config_usuario')).toBe('modo-oscuro');
      expect(localStorage.getItem('authData')).toBeNull();
    });
  });

  describe('actualizarDatosTrasCambio()', () => {
    const nuevoEmail = 'nuevo@uma.es';
    const nuevoNombre = 'Nuevo Nombre';

    // 1. CAMINO FELIZ
    it('debería actualizar el signal de nombre y el localStorage correctamente', () => {
      service.actualizarDatosTrasCambio(nuevoEmail, nuevoNombre);

      expect(service.userName()).toBe(nuevoNombre);
      expect(localStorage.getItem('userName')).toBe(nuevoNombre);
    });

    // 2. CASO DE BORDE
    it('debería manejar la actualización con strings vacíos si fuera necesario', () => {
      service.actualizarDatosTrasCambio('', '');

      expect(service.userName()).toBe('');
      expect(localStorage.getItem('userName')).toBe('');
    });

    // 3. MANEJO DE ERRORES (Prevención de inconsistencia)
    it('debería asegurar que el email se guarda con trim (si el servicio lo implementa)', () => {
      // Tu código actual en auth.ts no guarda el email en localStorage,
      // pero actualiza el estado. Verificamos que no rompa el flujo.
      service.actualizarDatosTrasCambio('  espacios@test.com  ', 'Test');

      expect(service.userName()).toBe('Test');
      // Si en el futuro guardas el email, aquí añadiríamos el expect del trim
    });

    // 4. INTEGRIDAD
    it('debería mantener el Token y el Rol intactos durante la actualización de datos de perfil', () => {
      localStorage.setItem('authData', 'Bearer token');
      localStorage.setItem('userRole', 'ADMIN');
      service.userRole.set('ADMIN');

      service.actualizarDatosTrasCambio(nuevoEmail, nuevoNombre);

      // Verificamos que lo importante no se ha borrado
      expect(localStorage.getItem('authData')).toBe('Bearer token');
      expect(service.userRole()).toBe('ADMIN');
      // Y que lo nuevo se ha aplicado
      expect(service.userName()).toBe(nuevoNombre);
    });
  });

});
