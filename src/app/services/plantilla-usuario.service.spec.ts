import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlantillaUsuarioService } from './plantilla-usuario.service';
import { PlantillaUsuario } from '../models/plantilla-usuario';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('PlantillaUsuarioService', () => {
  let service: PlantillaUsuarioService;
  let httpMock: HttpTestingController;
  const resource = '/plantillaUsuario';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlantillaUsuarioService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PlantillaUsuarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verificamos que no queden peticiones colgadas
    httpMock.verify();
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  describe('findAll() - Auditoría de Pilares', () => {
    const resource = '/plantillaUsuario';

    // PILAR 1: CAMINO FELIZ
    it('debería retornar la lista de plantillas cuando la API responde con éxito', () => {
      const mockBackend = [{ id: 1, nombre: 'Plantilla Alpha' }];

      service.findAll().subscribe(data => {
        expect(data.length).toBe(1);
        expect(data[0].nombre).toBe('Plantilla Alpha');
      });

      const req = httpMock.expectOne(resource);
      req.flush(mockBackend);
    });

    // PILAR 2: CASO DE BORDE
    it('debería manejar correctamente un array vacío para que la UI no intente leer nulos', () => {
      service.findAll().subscribe(data => {
        expect(data).toEqual([]);
      });

      httpMock.expectOne(resource).flush([]);
    });

    // PILAR 3: MANEJO DE ERRORES
    it('debería propagar el error 500 para que el componente pueda mostrar un aviso', () => {
      service.findAll().subscribe({
        error: (err) => expect(err.status).toBe(500)
      });

      httpMock.expectOne(resource).flush('Error', { status: 500, statusText: 'Server Error' });
    });

    // PILAR 4: INTEGRIDAD (El "Músculo" de la dieta)
    it('debería asegurar que "usuarios" sea siempre un array, incluso si el backend envía null', () => {
      // Simulamos que el backend está mal configurado y envía null
      const mockCorrupto = [{ id: 2, nombre: 'Plantilla Beta', usuarios: null }];

      service.findAll().subscribe(data => {
        // El servicio debe haber reparado esto
        expect(Array.isArray(data[0].usuarios)).toBe(true);
        expect(data[0].usuarios).toEqual([]);
      });

      httpMock.expectOne(resource).flush(mockCorrupto);
    });
  });

  describe('findById()', () => {
    const idBusqueda = 123;
    const urlEsperada = `${resource}/${idBusqueda}`;

    // 1. PILAR: CAMINO FELIZ (Verifica transformación)
    it('debería retornar la plantilla y asegurar que los usuarios sean un array', () => {
      const mockBackend = { id: idBusqueda, nombre: 'Plantilla VIP' }; // Viene sin usuarios

      service.findById(idBusqueda).subscribe((data) => {
        expect(data.id).toBe(idBusqueda);
        expect(Array.isArray(data.usuarios)).toBe(true); // Pilar: Integridad aplicado
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush(mockBackend);
    });

    // 2. PILAR: CASO DE BORDE (Robustez de entrada)
    it('debería manejar correctamente IDs inusuales en la construcción de la URL', () => {
      const idGrande = 999999;
      service.findById(idGrande).subscribe();

      const req = httpMock.expectOne(`${resource}/${idGrande}`);
      expect(req.request.url).toBe(`${resource}/999999`);
      req.flush({ id: idGrande, nombre: 'Test' });
    });

    // 3. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar el error 404 si el recurso no existe', () => {
      service.findById(idBusqueda).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(404)
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. PILAR: INTEGRIDAD TÉCNICA (Contrato)
    it('debería garantizar que la respuesta es un objeto íntegro aunque el server envíe null', () => {
      const mockCorrupto = { id: idBusqueda, nombre: 'Test', usuarios: null };

      service.findById(idBusqueda).subscribe((data) => {
        expect(data.usuarios).not.toBeNull();
        expect(data.usuarios).toEqual([]);
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush(mockCorrupto);
    });
  });

  describe('create() - Dieta de Pilares', () => {
    const resource = '/plantillaUsuario';

    // 1. PILAR: CAMINO FELIZ + INTEGRIDAD
    it('debería crear la plantilla y asegurar que la respuesta sea un objeto íntegro', () => {
      const nueva = { nombre: 'Test' };
      const mockRes = { id: 1, nombre: 'Test' }; // Server no envía el array usuarios

      service.create(nueva).subscribe(res => {
        expect(res.id).toBe(1);
        expect(Array.isArray(res.usuarios)).toBe(true); // Verificamos que el mapeo funcionó
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      req.flush(mockRes);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería limpiar el nombre de la plantilla (trim) antes de enviarla al servidor', () => {
      service.create({ nombre: '   Nombre Sucio   ' }).subscribe();

      const req = httpMock.expectOne(resource);
      // La dieta exige que el payload enviado esté limpio
      expect(req.request.body.nombre).toBe('Nombre Sucio');
      req.flush({ id: 2 });
    });

    // 3. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar el error 400 si los datos no cumplen las reglas del servidor', () => {
      service.create({}).subscribe({
        error: (err) => expect(err.status).toBe(400)
      });

      httpMock.expectOne(resource).flush('Invalid', { status: 400, statusText: 'Bad Request' });
    });

    // 4. PILAR: CASO DE BORDE (Robustez del Payload)
    it('debería asignar un nombre por defecto si se intenta crear una plantilla con nombre vacío', () => {
      service.create({ nombre: '' }).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.body.nombre).toBe('Nueva Plantilla');
      req.flush({ id: 3 });
    });
  });

  describe('update() - Dieta de Pilares', () => {
    const idUpdate = 77;
    const urlEsperada = `${resource}/${idUpdate}`;

    // 1. PILAR: CAMINO FELIZ + INTEGRIDAD DE RECURSO
    it('debería actualizar y retornar un objeto íntegro (reparando usuarios null)', () => {
      const cambios = { nombre: 'Nombre Editado' };
      // Simulamos que el server responde sin el array de usuarios
      const mockRes = { id: idUpdate, nombre: 'Nombre Editado' };

      service.update(idUpdate, cambios).subscribe(res => {
        expect(res.id).toBe(idUpdate);
        expect(Array.isArray(res.usuarios)).toBe(true); // Pilar: Integridad
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('PUT');
      req.flush(mockRes);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de Envío)
    it('debería limpiar el nombre antes de enviar la petición PUT', () => {
      service.update(idUpdate, { nombre: '   Update Sucio   ' }).subscribe();

      const req = httpMock.expectOne(urlEsperada);
      // Verificamos que el servicio aplicó el trim()
      expect(req.request.body.nombre).toBe('Update Sucio');
      req.flush({ id: idUpdate });
    });

    // 3. MANEJO DE ERRORES (Resiliencia)
    it('debería propagar error 403 si el usuario no tiene permisos', () => {
      service.update(idUpdate, {}).subscribe({
        error: (err) => expect(err.status).toBe(403)
      });

      httpMock.expectOne(urlEsperada).flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. PILAR: ROBUSTEZ (Validación de ID)
    it('debería construir la URL correctamente independientemente de los datos del body', () => {
      const idEspecial = 500;
      service.update(idEspecial, { nombre: 'Cambio' }).subscribe();

      const req = httpMock.expectOne(`${resource}/${idEspecial}`);
      expect(req.request.url).toBe(`${resource}/500`);
      req.flush({ id: idEspecial });
    });
  });

  describe('delete() - Dieta de Pilares', () => {
    const idDelete = 10;
    const urlEsperada = `${resource}/${idDelete}`;

    // 1. PILAR: CAMINO FELIZ (Confirmación de flujo)
    it('debería ejecutar el DELETE correctamente y completar el observable', () => {
      let completado = false;
      service.delete(idDelete).subscribe({
        complete: () => completado = true
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('DELETE');
      req.flush(null); // Respuesta estándar 204 No Content
      expect(completado).toBe(true);
    });

    // 2. PILAR: ROBUSTEZ (Validación Síncrona)
    it('debería lanzar un error inmediatamente si el ID es inválido (null/undefined)', () => {
      // @ts-ignore: Forzamos el error para probar el guardián de la dieta
      expect(() => service.delete(null)).toThrow('ID requerido');

      // Verificamos que no se intentó ninguna petición HTTP
      httpMock.expectNone(urlEsperada);
    });

    // 3. PILAR: MANEJO DE ERRORES (Resiliencia)
    it('debería propagar el error 404 si el servidor informa que el recurso no existe', () => {
      service.delete(99).subscribe({
        error: (err) => expect(err.status).toBe(404)
      });

      httpMock.expectOne(`${resource}/99`).flush('Not Found', {
        status: 404,
        statusText: 'Not Found'
      });
    });

    // 4. PILAR: INTEGRIDAD (Contrato Técnico)
    it('debería garantizar que la petición no incluya ningún cuerpo de datos (body)', () => {
      service.delete(idDelete).subscribe();

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.body).toBeNull(); // El estándar REST para DELETE
      req.flush(null);
    });
  });

});
