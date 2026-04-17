import {TestBed} from '@angular/core/testing';
import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {authInterceptor} from './auth.interceptor';
import {environment} from './environment';
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {firstValueFrom} from 'rxjs';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Integridad de URLs ', () => {

    // 1. CAMINO FELIZ
    it('debería transformar una ruta relativa estándar en una URL absoluta de la API', () => {
      httpClient.get('/usuarios').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
      expect(req.request.url).toBe(`${environment.apiUrl}/usuarios`); //
      req.flush({});
    });

    // 2. CASO DE BORDE: Sin slash inicial
    it('debería normalizar la URL si el desarrollador olvida el slash inicial', () => {
      httpClient.get('configuracion').subscribe();

      // El pilar de robustez debe prevenir que se genere "api/configuracion" (sin el slash de separación)
      const req = httpMock.expectOne(`${environment.apiUrl}/configuracion`);
      expect(req.request.url).toBe(`${environment.apiUrl}/configuracion`); //
      req.flush({});
    });

    // 3. CASO DE BORDE: URLs Externas
    it('debería ignorar y no modificar URLs que ya apuntan a dominios externos (HTTP/HTTPS)', () => {
      const urlExterna = 'https://assets.digitalocean.com/logo.png';
      httpClient.get(urlExterna).subscribe();

      const req = httpMock.expectOne(urlExterna);
      expect(req.request.url).toBe(urlExterna); // Integridad: No añadir prefijos a lo que ya es absoluto
      req.flush({});
    });

    // 4. INTEGRIDAD: URLs con parámetros
    it('debería mantener intactos los parámetros de consulta al reconstruir la URL', () => {
      const urlConParams = '/buscar?q=test&page=1';
      httpClient.get(urlConParams).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/buscar'));
      expect(req.request.urlWithParams).toContain('q=test');
      expect(req.request.urlWithParams).toContain('page=1'); //
      req.flush({});
    });
  });

  describe('Gestión de Seguridad e Integridad del Token', () => {

    // 1. CAMINO FELIZ: Inyección de Token
    it('debería adjuntar el encabezado Authorization cuando el token existe en localStorage', () => {
      const mockToken = 'Bearer token-valido-123';
      localStorage.setItem('authData', mockToken);

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/api/test'));
      // Verificamos Integridad del Header
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      req.flush({});
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería limpiar espacios en blanco del token antes de inyectarlo en la cabecera', () => {
      const tokenSucio = '   Bearer token-con-espacios   ';
      localStorage.setItem('authData', tokenSucio);

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/api/test'));
      // El pilar de sanitización debe haber actuado
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-con-espacios');
      req.flush({});
    });

    // 3. CASO DE BORDE: Token Vacío o Nulo
    it('NO debería añadir el encabezado Authorization si el localStorage está vacío', () => {
      localStorage.removeItem('authData');

      httpClient.get('/api/publico').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/api/publico'));
      // Protección de envío: No mandar cabeceras vacías o "null"
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    // 4. INTEGRIDAD: Persistencia del Token
    it('debería asegurar que el interceptor lee el valor más reciente de localStorage en cada petición', () => {
      // Primera petición con Token A
      localStorage.setItem('authData', 'Token-A');
      httpClient.get('/api/1').subscribe();
      httpMock.expectOne(r => r.url.includes('/api/1')).flush({});

      // Cambio de estado
      localStorage.setItem('authData', 'Token-B');
      httpClient.get('/api/2').subscribe();

      const req2 = httpMock.expectOne(r => r.url.includes('/api/2'));
      expect(req2.request.headers.get('Authorization')).toBe('Token-B');
      req2.flush({});
    });
  });

  describe('Manejo de Errores e Integridad del Flujo', () => {

    // 1. RESILIENCIA: Error de Servidor (500)
    it('debería propagar los errores 500 para que el servicio pueda gestionarlos', async () => {
      const request$ = httpClient.get('/error-interno');
      const promise = firstValueFrom(request$);

      const req = httpMock.expectOne(r => r.url.includes('/error-interno'));

      // Aquí defines el mensaje
      req.flush('Error Grave', { status: 500, statusText: 'Internal Server Error' });

      try {
        await promise;
      } catch (error: any) {
        // PILAR: MANEJO DE ERRORES - Verificamos integridad del error propagado
        expect(error.status).toBe(500);
        // AJUSTE: El texto debe ser el mismo que definiste arriba
        expect(error.statusText).toBe('Internal Server Error');
      }
    });

    // 2. CASO DE BORDE: Error de Autenticación (401)
    it('debería permitir que el error 401 fluya (necesario para redirección a login)', async () => {
      const request$ = httpClient.get('/privado');
      const promise = firstValueFrom(request$);

      const req = httpMock.expectOne(r => r.url.includes('/privado'));

      // Simulamos token expirado
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      try {
        await promise;
      } catch (error: any) {
        expect(error.status).toBe(401); // El sistema de Auth capturará esto después
      }
    });

    // 3. INTEGRIDAD: Peticiones múltiples
    it('debería manejar múltiples peticiones concurrentes manteniendo la integridad de cada una', () => {
      localStorage.setItem('authData', 'Bearer token-unificado');

      httpClient.get('/api/1').subscribe();
      httpClient.get('/api/2').subscribe();

      const req1 = httpMock.expectOne(r => r.url.includes('/api/1'));
      const req2 = httpMock.expectOne(r => r.url.includes('/api/2'));

      expect(req1.request.headers.get('Authorization')).toBe('Bearer token-unificado');
      expect(req2.request.headers.get('Authorization')).toBe('Bearer token-unificado');

      req1.flush({});
      req2.flush({});
    });
  });

});
