import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting, HttpTestingController} from '@angular/common/http/testing';
import {UsuarioService} from './usuario.service';
import {Usuario, UsuarioDTO} from '../models/usuario.model';
import {describe, it, expect, beforeEach, afterEach} from 'vitest';

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
    const resourceBusqueda = '/usuarios/buscar';

    // 1. PILAR: CAMINO FELIZ
    it('debería retornar los usuarios filtrados cuando la búsqueda es exitosa', () => {
      const mockDTO: UsuarioDTO[] = [{id: 1, nombre: 'Pedro', email: 'p@t.com', permiso: 'ADMIN'}];

      service.buscarUsuarios('pedro').subscribe(data => {
        expect(data.length).toBe(1);
        expect(data[0].nombre).toBe('Pedro');
      });

      const req = httpMock.expectOne(req => req.url.includes(resourceBusqueda));
      req.flush(mockDTO);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería limpiar espacios en blanco del término de búsqueda (trim)', () => {
      service.buscarUsuarios('   admin   ').subscribe();

      // Verificamos que el parámetro 'q' en la URL esté limpio
      const req = httpMock.expectOne(req => req.urlWithParams.includes('q=admin'));
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    // 3. PILAR: ROBUSTEZ (Caso de Borde)
    it('debería manejar términos nulos o vacíos enviando una cadena vacía en lugar de "null"', () => {
      // @ts-ignore
      service.buscarUsuarios(null).subscribe();

      const req = httpMock.expectOne(req => req.urlWithParams.includes('q='));
      expect(req.request.urlWithParams).not.toContain('null');
      req.flush([]);
    });

    // 4. PILAR: INTEGRIDAD (Mapeo de Seguridad)
    it('debería reparar datos de usuarios que vengan con campos nulos desde el servidor', () => {
      const mockCorrupto = [{id: 2, nombre: null, email: 'e@t.com', permiso: null}];

      service.buscarUsuarios('test').subscribe(data => {
        expect(data[0].nombre).toBe('Usuario sin nombre');
        expect(data[0].permiso).toBe('USER');
      });

      const req = httpMock.expectOne(req => req.url.includes(resourceBusqueda));
      req.flush(mockCorrupto);
    });

    // 5. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 500 si el motor de búsqueda falla', () => {
      service.buscarUsuarios('error').subscribe({
        error: (err) => expect(err.status).toBe(500)
      });

      const req = httpMock.expectOne(req => req.url.includes(resourceBusqueda));
      req.flush('Error', {status: 500, statusText: 'Server Error'});
    });
  });

  describe('getPerfil()', () => {
    const perfilUrl = '/usuarios/me';

    // 1. PILAR: CAMINO FELIZ
    it('debería retornar el perfil del usuario actual cuando el token es válido', () => {
      const mockUsuario: Usuario = {id: 1, nombre: 'Admin', email: 'admin@test.com', permiso: 'ADMIN'};

      service.getPerfil().subscribe(data => {
        expect(data.email).toBe('admin@test.com');
        expect(data.permiso).toBe('ADMIN');
      });

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuario);
    });

    // 2. PILAR: MANEJO DE ERRORES (Crítico para Auth)
    it('debería propagar error 401 cuando la sesión ha expirado', () => {
      service.getPerfil().subscribe({
        error: (error) => expect(error.status).toBe(401)
      });

      const req = httpMock.expectOne(perfilUrl);
      req.flush('Unauthorized', {status: 401, statusText: 'Unauthorized'});
    });

    // 3. PILAR: INTEGRIDAD (Reparación de datos)
    it('debería asignar un permiso por defecto si el servidor no lo envía', () => {
      // Caso de borde: el servidor envía un perfil incompleto
      const perfilIncompleto = {nombre: 'Juan', email: 'j@t.com'};

      service.getPerfil().subscribe(data => {
        expect(data.permiso).toBe('GUEST'); // El pilar de integridad actuó
        expect(data.nombre).toBe('Juan');
      });

      httpMock.expectOne(perfilUrl).flush(perfilIncompleto);
    });

    // 4. PILAR: CASO DE BORDE / ROBUSTEZ
    it('debería asegurar que la petición se hace exactamente a la subruta /me sin IDs expuestos', () => {
      service.getPerfil().subscribe();
      const req = httpMock.expectOne(perfilUrl);

      // Verificamos integridad de la URL (no debe concatenar IDs externos)
      expect(req.request.url).toBe('/usuarios/me');
      req.flush({});
    });
  });

  describe('updatePerfil()', () => {
    const perfilUrl = '/usuarios/me';

    // 1. PILAR: CAMINO FELIZ
    it('debería actualizar el perfil y retornar el usuario mapeado con éxito', () => {
      const datosUpdate = {nombre: 'Nuevo Nombre'};
      const mockRes = {id: 1, nombre: 'Nuevo Nombre', email: 'test@uma.es', permiso: 'ADMIN'};

      service.updatePerfil(datosUpdate).subscribe(res => {
        expect(res.nombre).toBe('Nuevo Nombre');
        expect(res.permiso).toBe('ADMIN');
      });

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.method).toBe('PUT');
      req.flush(mockRes);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería limpiar el nombre y el email (trim/lowercase) antes de enviar la petición', () => {
      const sucio = {nombre: '  Admin  ', email: 'ADMIN@UMA.ES'};

      service.updatePerfil(sucio).subscribe();

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.body.nombre).toBe('Admin');
      expect(req.request.body.email).toBe('admin@uma.es');
      req.flush({});
    });

    // 3. PILAR: ROBUSTEZ (Caso de Borde)
    it('debería permitir el envío de contrasenia si el modelo lo requiere', () => {
      const conPass = {contrasenia: 'secret123'};

      service.updatePerfil(conPass).subscribe();

      const req = httpMock.expectOne(perfilUrl);
      expect(req.request.body.contrasenia).toBe('secret123');
      req.flush({});
    });

    // 4. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 400 si los datos de actualización son inválidos', () => {
      service.updatePerfil({}).subscribe({
        error: (err) => expect(err.status).toBe(400)
      });

      httpMock.expectOne(perfilUrl).flush('Bad Request', {status: 400, statusText: 'Bad Request'});
    });

    // 5. PILAR: INTEGRIDAD (Respuesta segura)
    it('debería asegurar un objeto de perfil íntegro incluso si el servidor responde parcialmente', () => {
      service.updatePerfil({nombre: 'X'}).subscribe(res => {
        expect(res.permiso).toBe('GUEST'); // El pilar de integridad repara el campo ausente
      });

      httpMock.expectOne(perfilUrl).flush({id: 1, nombre: 'X'});
    });
  });

  describe('getUsuarios()', () => {
    const resource = '/usuarios';

    // 1. PILAR: CAMINO FELIZ
    it('debería retornar la lista completa de usuarios cuando la API responde con éxito', () => {
      const mockUsuarios: Usuario[] = [
        {id: 1, nombre: 'Admin', email: 'admin@test.com', permiso: 'ROOT'},
        {id: 2, nombre: 'User', email: 'user@test.com', permiso: 'USER'}
      ];

      service.getUsuarios().subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data[0].permiso).toBe('ROOT');
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuarios);
    });

    // 2. PILAR: CASO DE BORDE (Robustez)
    it('debería manejar una respuesta vacía [] sin lanzar errores de ejecución', () => {
      service.getUsuarios().subscribe((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      });

      httpMock.expectOne(resource).flush([]);
    });

    // 3. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 403 si el usuario actual no tiene rango para listar el sistema', () => {
      service.getUsuarios().subscribe({
        error: (error) => expect(error.status).toBe(403)
      });

      httpMock.expectOne(resource).flush('Forbidden', {status: 403, statusText: 'Forbidden'});
    });

    // 4. PILAR: INTEGRIDAD (Mapeo de Seguridad)
    it('debería asegurar que cada usuario de la lista sea un objeto íntegro aunque el server envíe nulos', () => {
      const mockCorrupto = [{id: 99, nombre: null, email: null}]; // Faltan campos clave

      service.getUsuarios().subscribe(data => {
        expect(data[0].nombre).toBe('Sin nombre');
        expect(data[0].email).toBe('sin@email.com');
        expect(data[0].permiso).toBe('USER'); // Valor por defecto de la dieta
      });

      httpMock.expectOne(resource).flush(mockCorrupto);
    });
  });

  describe('getUsuarioById()', () => {
    const idBusqueda = 5;
    const urlEsperada = `/usuarios/${idBusqueda}`;

    // 1. PILAR: CAMINO FELIZ
    it('debería retornar los datos de un usuario específico cuando el ID existe', () => {
      const mockUsuario: Usuario = {id: idBusqueda, nombre: 'Juan Perez', email: 'juan@test.com', permiso: 'USER'};

      service.getUsuarioById(idBusqueda).subscribe((data) => {
        expect(data.id).toBe(idBusqueda);
        expect(data.nombre).toBe('Juan Perez');
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsuario);
    });

    // 2. PILAR: ROBUSTEZ (Validación Síncrona)
    it('debería lanzar un error si el ID proporcionado es nulo', () => {
      // @ts-ignore
      expect(() => service.getUsuarioById(null)).toThrow('ID de usuario no proporcionado');
      httpMock.expectNone(urlEsperada);
    });

  // 3. PILAR: CASO DE BORDE (IDs grandes)
    it('debería construir la URL correctamente con IDs de múltiples dígitos', () => {
      let llamado = false;

      service.getUsuarioById(12345).subscribe(res => {
        // PILAR: INTEGRIDAD - Validamos que recibimos un objeto (aunque esté vacío)
        expect(res).toBeDefined();
        llamado = true;
      });

      const req = httpMock.expectOne('/usuarios/12345');
      expect(req.request.method).toBe('GET'); // Aserción extra de contrato
      req.flush({});

      // Aserción final para que SonarQube vea que el flujo se completó
      expect(llamado).toBe(true);
    });

    // 4. PILAR: MANEJO DE ERRORES
    it('debería retornar error 404 si el usuario solicitado no existe en el sistema', () => {
      service.getUsuarioById(idBusqueda).subscribe({
        error: (error) => expect(error.status).toBe(404)
      });

      httpMock.expectOne(urlEsperada).flush('Not Found', {status: 404, statusText: 'Not Found'});
    });

    // 5. PILAR: INTEGRIDAD (Mapeo de seguridad)
    it('debería reparar el objeto usuario si faltan campos obligatorios en la respuesta', () => {
      const incompleto = {id: idBusqueda, nombre: 'Juan'}; // Falta email y permiso

      service.getUsuarioById(idBusqueda).subscribe(data => {
        expect(data.email).toBe('sin@email.com');
        expect(data.permiso).toBe('USER');
      });

      httpMock.expectOne(urlEsperada).flush(incompleto);
    });
  });

  describe('crearUsuario()', () => {

    // 1. PILAR: CAMINO FELIZ + INTEGRIDAD
    it('debería crear el usuario y asegurar que la respuesta sea un objeto íntegro', () => {
      const nuevo = { nombre: 'Admin', email: 'admin@uma.es' };
      const mockRes = { id: 99, nombre: 'Admin', email: 'admin@uma.es', permiso: 'USER' };

      service.crearUsuario(nuevo).subscribe(res => {
        expect(res.id).toBe(99);
        expect(res.nombre).toBe('Admin');
        expect(res.permiso).toBe('USER'); // Pilar de integridad verificado
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      req.flush(mockRes);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería limpiar espacios y normalizar el email a minúsculas antes del envío', () => {
      const sucio = { nombre: '  Juan  ', email: 'JUAN@UMA.ES' };

      service.crearUsuario(sucio).subscribe(res => {
        expect(res).toBeDefined(); // Aserción explícita para SonarQube
      });

      const req = httpMock.expectOne(resource);
      // La dieta exige que el payload enviado esté limpio
      expect(req.request.body.nombre).toBe('Juan');
      expect(req.request.body.email).toBe('juan@uma.es');
      req.flush({ id: 1, ...req.request.body });
    });

    // 3. PILAR: ROBUSTEZ (Caso de Borde)
    it('debería asignar valores por defecto coherentes si faltan campos en el modelo', () => {
      service.crearUsuario({ email: 'test@uma.es' }).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.body.nombre).toBe('Nuevo Usuario');
      expect(req.request.body.permiso).toBe('USER');
      req.flush({ id: 2, ...req.request.body });
    });

    // 4. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 409 si el servidor detecta un email duplicado', () => {
      service.crearUsuario({ email: 'repetido@uma.es' }).subscribe({
        next: () => expect.fail('Debería haber fallado con 409'),
        error: (err) => {
          expect(err.status).toBe(409);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    });

    // 5. PILAR: INTEGRIDAD DEL CONTRATO
    it('debería asegurar que no se añaden parámetros extra en la URL durante el POST', () => {
      service.crearUsuario({ nombre: 'Test' }).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.url).toBe('/usuarios');
      expect(req.request.method).toBe('POST');
      req.flush({ id: 3 });
    });
  });

  describe('updateUsuario()', () => {
    const idEdit = 42;
    const urlEdit = `/usuarios/${idEdit}`;

    // 1. PILAR: CAMINO FELIZ + INTEGRIDAD
    it('debería actualizar el usuario y asegurar que el resultado sea íntegro', () => {
      const cambios = { nombre: 'Nombre Editado' };
      const mockRes = { id: idEdit, nombre: 'Nombre Editado', permiso: 'ADMIN' };

      service.updateUsuario(idEdit, cambios).subscribe(res => {
        expect(res.id).toBe(idEdit);
        expect(res.nombre).toBe('Nombre Editado');
        expect(res.permiso).toBe('ADMIN'); // Verificamos que el mapeo funcionó
      });

      const req = httpMock.expectOne(urlEdit);
      expect(req.request.method).toBe('PUT');
      req.flush(mockRes);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería normalizar email y nombre antes de realizar la petición PUT', () => {
      const sucio = { nombre: '  Editado  ', email: 'EDIT@UMA.ES' };

      service.updateUsuario(idEdit, sucio).subscribe(res => {
        expect(res).toBeDefined(); // Aserción explícita para SonarQube
      });

      const req = httpMock.expectOne(urlEdit);
      expect(req.request.body.nombre).toBe('Editado');
      expect(req.request.body.email).toBe('edit@uma.es');
      req.flush({ id: idEdit });
    });

    // 3. PILAR: ROBUSTEZ (Validación Síncrona)
    it('debería lanzar error si se intenta actualizar sin un ID válido', () => {
      // @ts-ignore
      expect(() => service.updateUsuario(null, {})).toThrow('ID requerido');
      httpMock.expectNone(urlEdit);
    });

    // 4. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 403 si el administrador no tiene permisos suficientes', () => {
      service.updateUsuario(idEdit, {}).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (err) => expect(err.status).toBe(403)
      });

      const req = httpMock.expectOne(urlEdit);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 5. PILAR: CASO DE BORDE (ID en URL vs Body)
    it('debería priorizar el ID de la URL y asegurar que la ruta es correcta', () => {
      let verificado = false;
      service.updateUsuario(99, { nombre: 'Test' }).subscribe(() => verificado = true);

      const req = httpMock.expectOne('/usuarios/99');
      expect(req.request.url).toBe('/usuarios/99');
      req.flush({ id: 99 });
      expect(verificado).toBe(true);
    });
  });

  describe('eliminarUsuario()', () => {
    const idDelete = 10;
    const urlDelete = `/usuarios/${idDelete}`;

    // 1. PILAR: CAMINO FELIZ (Confirmación de cierre)
    it('debería ejecutar el DELETE y completar el flujo correctamente', () => {
      let completado = false;
      service.eliminarUsuario(idDelete).subscribe({
        complete: () => completado = true
      });

      const req = httpMock.expectOne(urlDelete);
      expect(req.request.method).toBe('DELETE');
      req.flush(null); // 204 No Content

      expect(completado).toBe(true); // Aserción de flujo para SonarQube
    });

    // 2. PILAR: ROBUSTEZ (Validación Síncrona)
    it('debería lanzar un error síncrono si el ID es nulo o indefinido', () => {
      // @ts-ignore
      expect(() => service.eliminarUsuario(null)).toThrow('ID requerido');
      httpMock.expectNone(urlDelete);
    });

    // 3. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 404 si el usuario ya no existe en el sistema', () => {
      service.eliminarUsuario(99).subscribe({
        error: (err) => expect(err.status).toBe(404)
      });

      const req = httpMock.expectOne('/usuarios/99');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. PILAR: INTEGRIDAD DEL CONTRATO
    it('debería garantizar que la petición DELETE no envíe un cuerpo de datos', () => {
      let llamado = false;
      service.eliminarUsuario(idDelete).subscribe(() => llamado = true);

      const req = httpMock.expectOne(urlDelete);
      expect(req.request.body).toBeNull();
      req.flush(null);

      expect(llamado).toBe(true);
    });

    // 5. PILAR: CASO DE BORDE (Seguridad de URL)
    it('debería construir la URL de eliminación de forma segura con IDs altos', () => {
      const idAlto = 999999;
      service.eliminarUsuario(idAlto).subscribe();

      const req = httpMock.expectOne(`/usuarios/${idAlto}`);
      expect(req.request.url).toContain('999999');
      req.flush(null);
    });
  });

});
