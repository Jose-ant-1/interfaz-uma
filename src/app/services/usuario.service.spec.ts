import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UsuarioService } from './usuario.service';
import { Usuario, UsuarioDTO } from '../models/usuario.model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('UsuarioService', () => {
  let service: UsuarioService;
  let httpMock: HttpTestingController;
  const resource = '/usuarios';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsuarioService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(UsuarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verificamos que no queden peticiones pendientes
    httpMock.verify();
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  describe('buscarUsuarios()', () => {
    const termino = 'pedro';
    const urlEsperada = `${resource}/buscar?q=${termino}`;

    // 1. CAMINO FELIZ
    it('debería retornar una lista de usuarios (DTO) que coincidan con el término', () => {
      // Usamos las propiedades exactas de tu UsuarioDTO: id, nombre, email, permiso
      const mockUsuarios: UsuarioDTO[] = [
        {
          id: 1,
          nombre: 'Pedro Picapiedra',
          email: 'pedro@test.com',
          permiso: 'USER'
        }
      ];

      service.buscarUsuarios(termino).subscribe((data) => {
        expect(data.length).toBe(1);
        expect(data[0].nombre).toBe('Pedro Picapiedra');
        expect(data[0].permiso).toBe('USER');
        expect(data).toEqual(mockUsuarios);
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuarios);
    });

    // 2. CASO DE BORDE
    it('debería manejar una búsqueda sin resultados devolviendo un array vacío', () => {
      service.buscarUsuarios('usuario_inexistente').subscribe((data) => {
        expect(data).toEqual([]);
        expect(data.length).toBe(0);
      });

      const req = httpMock.expectOne(`${resource}/buscar?q=usuario_inexistente`);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES
    it('debería propagar error 500 si el motor de búsqueda del servidor falla', () => {
      service.buscarUsuarios(termino).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Error de búsqueda', { status: 500, statusText: 'Internal Server Error' });
    });

// 4. INTEGRIDAD (CORREGIDO)
    it('debería incluir correctamente el parámetro "q" en la URL de consulta y usar método GET', () => {
      const terminoEspecial = 'admin@123';
      service.buscarUsuarios(terminoEspecial).subscribe();

      // Buscamos la petición que contenga la ruta correcta
      const req = httpMock.expectOne(r => r.url.includes('/usuarios/buscar'));

      expect(req.request.method).toBe('GET');

      // CAMBIO CLAVE: Validamos que el parámetro esté presente en la URL bruta
      // ya que se concatena manualmente en el servicio con `?q=`
      expect(req.request.urlWithParams).toContain(`q=${terminoEspecial}`);

      req.flush([]);
    });
  });

  describe('getPerfil()', () => {
    const perfilUrl = `${resource}/me`;

    // 1. CAMINO FELIZ
    it('debería retornar el perfil del usuario actual (Usuario)', () => {
      const mockUsuario: Usuario = {
        id: 1,
        nombre: 'Usuario Test',
        email: 'test@uma.es',
        permiso: 'ADMIN'
      };

      service.getPerfil().subscribe((data) => {
        expect(data).toEqual(mockUsuario);
        expect(data.email).toBe('test@uma.es');
      });

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuario);
    });

    // 2. CASO DE BORDE
    it('debería manejar correctamente un perfil con campos opcionales ausentes', () => {
      const usuarioMinimo: Usuario = {
        nombre: 'Anonimo',
        email: 'anon@test.com'
      };

      service.getPerfil().subscribe((data) => {
        expect(data.permiso).toBeUndefined();
        expect(data.nombre).toBe('Anonimo');
      });

      const req = httpMock.expectOne(perfilUrl);
      req.flush(usuarioMinimo);
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 401 si el token es inválido o ha expirado', () => {
      service.getPerfil().subscribe({
        next: () => expect.fail('Debería haber fallado con 401'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(perfilUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición se hace exactamente a la subruta /me', () => {
      service.getPerfil().subscribe();
      const req = httpMock.expectOne(perfilUrl);

      expect(req.request.url).toBe('/usuarios/me');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('updatePerfil()', () => {
    const perfilUrl = `${resource}/me`;
    const datosUpdate: Partial<Usuario> = { nombre: 'Nombre Editado' };

    // 1. CAMINO FELIZ
    it('debería enviar una petición PUT con los nuevos datos y retornar el usuario actualizado', () => {
      const usuarioResult: Usuario = {
        id: 1,
        nombre: 'Nombre Editado',
        email: 'test@uma.es'
      };

      service.updatePerfil(datosUpdate).subscribe((res) => {
        expect(res.nombre).toBe('Nombre Editado');
      });

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(datosUpdate);
      req.flush(usuarioResult);
    });

    // 2. CASO DE BORDE
    it('debería permitir actualizar la contraseña enviando el campo contrasenia', () => {
      const updatePass: Partial<Usuario> = { contrasenia: 'new-pass-123' };

      service.updatePerfil(updatePass).subscribe();

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.body.contrasenia).toBe('new-pass-123');
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar error 400 si los datos de actualización no son válidos', () => {
      service.updatePerfil(datosUpdate).subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (e) => expect(e.status).toBe(400)
      });

      const req = httpMock.expectOne(perfilUrl);
      req.flush('Invalid data', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que se usa el método PUT y no se envían parámetros en la URL', () => {
      service.updatePerfil(datosUpdate).subscribe();

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.method).toBe('PUT');
      // Verificamos que no haya "basura" en la URL (como IDs) ya que es /me
      expect(req.request.urlWithParams).toBe(perfilUrl);
      req.flush({});
    });
  });

  describe('getUsuarios()', () => {
    // 1. CAMINO FELIZ
    it('debería retornar la lista completa de usuarios del sistema', () => {
      const mockUsuarios: Usuario[] = [
        { id: 1, nombre: 'Admin', email: 'admin@test.com', permiso: 'ROOT' },
        { id: 2, nombre: 'User', email: 'user@test.com', permiso: 'USER' }
      ];

      service.getUsuarios().subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data).toEqual(mockUsuarios);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuarios);
    });

    // 2. CASO DE BORDE
    it('debería manejar una respuesta de servidor con una lista vacía', () => {
      service.getUsuarios().subscribe((data) => {
        expect(data).toEqual([]);
      });

      const req = httpMock.expectOne(resource);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 403 si el usuario no tiene permisos para listar usuarios', () => {
      service.getUsuarios().subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(403)
      });

      const req = httpMock.expectOne(resource);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD
    it('debería realizar la petición al recurso base sin parámetros adicionales', () => {
      service.getUsuarios().subscribe();
      const req = httpMock.expectOne(resource);

      expect(req.request.url).toBe(resource);
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });
  });

  describe('getUsuarioById()', () => {
    const idBusqueda = 5;
    const urlEsperada = `${resource}/${idBusqueda}`;

    // 1. CAMINO FELIZ
    it('debería retornar los datos de un usuario específico por su ID', () => {
      const mockUsuario: Usuario = {
        id: idBusqueda,
        nombre: 'Juan Perez',
        email: 'juan@test.com'
      };

      service.getUsuarioById(idBusqueda).subscribe((data) => {
        expect(data.id).toBe(idBusqueda);
        expect(data.nombre).toBe('Juan Perez');
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuario);
    });

    // 2. CASO DE BORDE
    it('debería construir la URL correctamente con IDs de múltiples dígitos', () => {
      const idLargo = 12345;
      service.getUsuarioById(idLargo).subscribe();

      const req = httpMock.expectOne(`${resource}/12345`);
      expect(req.request.url).toContain('12345');
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 404 si el usuario solicitado no existe', () => {
      service.getUsuarioById(idBusqueda).subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (error) => expect(error.status).toBe(404)
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que se usa el método GET y no se envía cuerpo', () => {
      service.getUsuarioById(idBusqueda).subscribe();
      const req = httpMock.expectOne(urlEsperada);

      expect(req.request.method).toBe('GET');
      expect(req.request.body).toBeNull();
      req.flush({});
    });
  });

  describe('crearUsuario()', () => {
    const nuevoUsuario: Partial<Usuario> = {
      nombre: 'Nuevo Usuario',
      email: 'nuevo@test.com',
      permiso: 'USER'
    };

    // 1. CAMINO FELIZ
    it('debería enviar una petición POST y retornar el usuario creado con su ID', () => {
      const mockResponse: Usuario = { id: 100, ...nuevoUsuario } as Usuario;

      service.crearUsuario(nuevoUsuario).subscribe((res) => {
        expect(res.id).toBe(100);
        expect(res.nombre).toBe(nuevoUsuario.nombre);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevoUsuario);
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE
    it('debería permitir la creación enviando solo los campos obligatorios del modelo', () => {
      const usuarioMinimo: Partial<Usuario> = { nombre: 'Min', email: 'm@t.com' };
      service.crearUsuario(usuarioMinimo).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.body).toEqual(usuarioMinimo);
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar error 400 si el email ya existe en el sistema', () => {
      service.crearUsuario(nuevoUsuario).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (e) => expect(e.status).toBe(400)
      });

      const req = httpMock.expectOne(resource);
      req.flush('Email duplicado', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición POST no contiene parámetros en la URL', () => {
      service.crearUsuario(nuevoUsuario).subscribe();
      const req = httpMock.expectOne(resource);
      expect(req.request.urlWithParams).toBe(resource);
      req.flush({});
    });
  });

  describe('updateUsuario()', () => {
    const idUpdate = 5;
    const urlEsperada = `${resource}/${idUpdate}`;
    const datosUpdate: Partial<Usuario> = { permiso: 'ADMIN' };

    // 1. CAMINO FELIZ
    it('debería actualizar los datos del usuario mediante PUT y retornar el resultado', () => {
      const mockResponse: Usuario = { id: idUpdate, nombre: 'Test', email: 't@t.com', permiso: 'ADMIN' };

      service.updateUsuario(idUpdate, datosUpdate).subscribe((res) => {
        expect(res.permiso).toBe('ADMIN');
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(datosUpdate);
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE
    it('debería manejar correctamente IDs negativos o inusuales si el backend lo permite', () => {
      let llamado = false;

      service.updateUsuario(-1, datosUpdate).subscribe(() => {
        llamado = true;
      });

      const req = httpMock.expectOne(`${resource}/-1`);
      req.flush({}); // Simulamos respuesta exitosa

      // ASERCIÓN FORMAL PARA SONARQUBE
      expect(llamado).toBe(true);
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 404 si el usuario a actualizar no existe', () => {
      service.updateUsuario(999, datosUpdate).subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (e) => expect(e.status).toBe(404)
      });

      const req = httpMock.expectOne(`${resource}/999`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la URL de actualización incluye el ID correctamente', () => {
      service.updateUsuario(idUpdate, datosUpdate).subscribe();
      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.url).toBe(`/usuarios/${idUpdate}`);
      req.flush({});
    });
  });

  describe('eliminarUsuario()', () => {
    const idDelete = 20;
    const urlEsperada = `${resource}/${idDelete}`;

    // 1. CAMINO FELIZ
    it('debería enviar una petición DELETE y confirmar la eliminación', () => {
      let completado = false;
      service.eliminarUsuario(idDelete).subscribe({
        next: (res) => {
          expect(res).toBeNull();
          completado = true;
        }
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(completado).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería funcionar con IDs muy altos', () => {
      let exito = false;
      service.eliminarUsuario(999999).subscribe(() => exito = true);

      const req = httpMock.expectOne(`${resource}/999999`);
      req.flush(null);
      expect(exito).toBe(true);
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 403 si el usuario actual no tiene permisos de borrado', () => {
      service.eliminarUsuario(idDelete).subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (e) => expect(e.status).toBe(403)
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición DELETE no lleva cuerpo (body)', () => {
      service.eliminarUsuario(idDelete).subscribe();
      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.body).toBeNull();
      req.flush(null);
    });
  });

});
