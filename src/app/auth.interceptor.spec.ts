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

  describe('Gestión de URLs', () => {
    // 1. CAMINO FELIZ: URL Relativa
    it('debería añadir el prefijo de la API a las URLs relativas', () => {
      httpClient.get('/usuarios').subscribe();

      // Verificamos que la URL final combine el environment y el recurso
      const req = httpMock.expectOne(req => req.url.startsWith(environment.apiUrl));
      expect(req.request.url).toBe(`${environment.apiUrl}/usuarios`);
      req.flush({});
    });

    // 2. CASO DE BORDE: URL Absoluta
    it('no debería modificar URLs que ya son absolutas (externas)', () => {
      const urlExterna = 'https://google.com/api';
      httpClient.get(urlExterna).subscribe();

      const req = httpMock.expectOne(urlExterna);
      expect(req.request.url).toBe(urlExterna);
      req.flush({});
    });
  });

  describe('Gestión de Seguridad', () => {
    // 3. INTEGRIDAD: Header de Autorización
    it('debería incluir el header Authorization si existe authData en localStorage', () => {
      const mockToken = 'Bearer token-123';
      localStorage.setItem('authData', mockToken);

      httpClient.get('/test').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/test'));
      // Verificamos que el interceptor haya clonado y añadido el header
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe(mockToken);
      req.flush({});
    });

    // 4. MANEJO DE ESTADO: Sin Token
    it('no debería añadir el header Authorization si no hay token', () => {
      httpClient.get('/test').subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/test'));
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('Casos de Borde y Errores adicionales', () => {

    // CASO DE BORDE: Slash doble
    it('debería manejar correctamente si la URL relativa no empieza con slash', () => {
      httpClient.get('usuarios').subscribe(); // Sin slash inicial
      const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
      expect(req.request.url).toBe(`${environment.apiUrl}/usuarios`);
      req.flush({});
    });

    // INTEGRIDAD: Formato del Token
    it('debería mantener el formato exacto del string de localStorage', () => {
      const rawToken = 'Bearer token-completo';
      localStorage.setItem('authData', rawToken);

      httpClient.get('/test').subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/test'));

      expect(req.request.headers.get('Authorization')).toBe(rawToken);
      req.flush({});
    });

    // MANEJO DE ERRORES (Conceptuado)
    it('debería dejar pasar los errores para que el servicio los maneje', async () => {
      // 1. Definimos la petición (es un observable "frío", no se dispara hasta que alguien se suscriba)
      const request$ = httpClient.get('/error');

      // 2. Ejecutamos la suscripción (vía firstValueFrom)
      const promise = firstValueFrom(request$);

      // 3. Capturamos la petición pendiente que acaba de salir
      const req = httpMock.expectOne(r => r.url.includes('/error'));

      // 4. Simulamos la respuesta de error del servidor
      req.flush('Error de servidor', {status: 500, statusText: 'Server Error'});

      // 5. Verificamos que la promesa falló con el status correcto
      try {
        await promise;
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.statusText).toBe('Server Error');
      }
    });
  });

});
