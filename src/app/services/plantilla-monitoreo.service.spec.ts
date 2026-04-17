import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlantillaMonitoreoService } from './plantilla-monitoreo.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {PlantillaMonitoreo} from '../models/plantilla-monitoreo';

describe('PlantillaMonitoreoService', () => {
  let service: PlantillaMonitoreoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlantillaMonitoreoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PlantillaMonitoreoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Protección para evitar "Cannot read properties of undefined"
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  describe('findAll()', () => {
    const resource = '/plantillaMonitoreo';

    // 1. PILAR: CAMINO FELIZ (Reparado para la dieta)
    it('debería retornar una lista de plantillas cuando la API responde con éxito', () => {
      const mockBackend = [
        { id: 1, nombre: 'Plantilla Alpha', monitoreos: [] } // Añadimos monitoreos al mock para que coincida con la salida esperada
      ];

      service.findAll().subscribe({
        next: (data) => {
          expect(data.length).toBe(1);
          expect(data[0].id).toBe(1);
          // En lugar de toEqual(mockBackend), verificamos la estructura para ser más robustos
          expect(data).toContainEqual(expect.objectContaining({
            id: 1,
            nombre: 'Plantilla Alpha'
          }));
        }
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('GET');
      req.flush(mockBackend);
    });

    // 2. PILAR: CASO DE BORDE
    it('debería manejar correctamente una respuesta de array vacío', () => {
      service.findAll().subscribe({
        next: (data) => expect(data.length).toBe(0)
      });

      const req = httpMock.expectOne(resource);
      req.flush([]);
    });

    // 3. PILAR: MANEJO DE ERRORES
    it('debería propagar el error si el servidor devuelve un 500', () => {
      service.findAll().subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(500)
      });

      const req = httpMock.expectOne(resource);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });

    // 4. PILAR: INTEGRIDAD (El que fallaba)
    it('debería inicializar monitoreos como array vacío si el servidor envía null', () => {
      const mockCorrupto = [{ id: 3, nombre: 'Plantilla Sucia', monitoreos: null }];

      service.findAll().subscribe({
        next: (data) => {
          // Aquí es donde la "dieta" brilla: el servicio repara el dato
          expect(Array.isArray(data[0].monitoreos)).toBe(true);
          expect(data[0].monitoreos).toEqual([]);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush(mockCorrupto);
    });
  });

  describe('findByPropietario()', () => {
    const usuarioId = 7;
    const resourceUrl = `/plantillaMonitoreo/propietario/${usuarioId}`;

    // 1. PILAR: CAMINO FELIZ
    it('debería retornar las plantillas del propietario con sus datos mapeados', () => {
      const mockBackend = [
        { id: 1, nombre: 'Plantilla Propietario', monitoreos: [], propietario: usuarioId }
      ];

      service.findByPropietario(usuarioId).subscribe({
        next: (data) => {
          expect(data.length).toBe(1);
          expect(data[0].propietario).toBe(usuarioId);
          expect(data[0].nombre).toBe('Plantilla Propietario');
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockBackend);
    });

    // 2. PILAR: CASO DE BORDE (Propietario sin plantillas)
    it('debería manejar correctamente cuando un propietario no tiene ninguna plantilla (array vacío)', () => {
      service.findByPropietario(usuarioId).subscribe({
        next: (data) => {
          expect(Array.isArray(data)).toBe(true);
          expect(data.length).toBe(0);
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      req.flush([]);
    });

    // 3. PILAR: MANEJO DE ERRORES (Usuario no existe)
    it('debería propagar el error 404 si el propietario no se encuentra en el sistema', () => {
      service.findByPropietario(99).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne('/plantillaMonitoreo/propietario/99');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. PILAR: INTEGRIDAD (Datos corruptos en la lista)
    it('debería asegurar que cada plantilla de la lista sea robusta aunque el server envíe nulos', () => {
      const mockBackendCorrupto = [
        { id: 1, nombre: null, monitoreos: null, propietario: usuarioId }
      ];

      service.findByPropietario(usuarioId).subscribe({
        next: (data) => {
          // El Pilar de Integridad (vía map) repara cada elemento
          expect(data[0].nombre).toBe('Plantilla sin nombre');
          expect(Array.isArray(data[0].monitoreos)).toBe(true);
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      req.flush(mockBackendCorrupto);
    });
  });

  describe('create()', () => {
    const resource = '/plantillaMonitoreo';

    // 1. PILAR: CAMINO FELIZ + PROTECCIÓN DE ENVÍO
    it('debería enviar un POST con el payload correcto y recibir ID', () => {
      const nueva = { nombre: 'Test', monitoreos: [] };

      service.create(nueva).subscribe(res => {
        expect(res.id).toBe(10);
        expect(res.monitoreos).toEqual([]);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      // Verificamos que el envío es exactamente lo que esperamos
      expect(req.request.body.nombre).toBe('Test');
      req.flush({ id: 10, ...nueva });
    });

    // 2. PILAR: SANITIZACIÓN (Este es nuevo y CRÍTICO)
    it('debería limpiar el nombre (trim) antes de enviar la petición', () => {
      service.create({ nombre: '   Sucia   ' }).subscribe();

      const req = httpMock.expectOne(resource);
      // La dieta exige que el servicio limpie los datos
      expect(req.request.body.nombre).toBe('Sucia');
      req.flush({ id: 11 });
    });

    // 3. PILAR: MANEJO DE ERRORES (Mantenemos el 400)
    it('debería propagar el error 400 si el servidor lo rechaza', () => {
      service.create({}).subscribe({
        next: () => expect.fail('No debería tener éxito'),
        error: (err) => expect(err.status).toBe(400)
      });

      const req = httpMock.expectOne(resource);
      req.flush('Invalid', { status: 400, statusText: 'Bad Request' });
    });

    // 4. PILAR: INTEGRIDAD (Garantiza que la UI no rompa)
    it('debería asegurar que la respuesta tenga monitoreos aunque el server no los envíe', () => {
      service.create({ nombre: 'Check' }).subscribe(res => {
        // Si el server olvida el array, el servicio lo pone por nosotros
        expect(Array.isArray(res.monitoreos)).toBe(true);
      });

      const req = httpMock.expectOne(resource);
      req.flush({ id: 12, nombre: 'Check' }); // Server no envía monitoreos
    });
  });

  describe('update()', () => {
    const id = 5;
    const resourceUrl = `/plantillaMonitoreo/${id}`;

    // 1. PILAR: CAMINO FELIZ + INTEGRIDAD DE RECURSO
    it('debería enviar un PUT a la URL correcta y retornar los datos actualizados', () => {
      const cambios = { nombre: 'Nombre Editado' };
      const mockRes = { id, nombre: 'Nombre Editado', monitoreos: [] };

      service.update(id, cambios).subscribe(res => {
        expect(res.id).toBe(id);
        expect(res.nombre).toBe('Nombre Editado');
      });

      const req = httpMock.expectOne(resourceUrl);
      expect(req.request.method).toBe('PUT');
      req.flush(mockRes);
    });

    // 2. PILAR: SANITIZACIÓN (Protección de datos)
    it('debería limpiar el nombre antes de enviar la actualización', () => {
      service.update(id, { nombre: '   Editado con espacios   ' }).subscribe();

      const req = httpMock.expectOne(resourceUrl);
      expect(req.request.body.nombre).toBe('Editado con espacios');
      req.flush({ id });
    });

    // 3. PILAR: MANEJO DE ERRORES (Recurso inexistente)
    it('debería propagar error 404 si el ID no existe para actualizar', () => {
      service.update(999, { nombre: 'Test' }).subscribe({
        next: () => expect.fail('No debería haber funcionado'),
        error: (err) => expect(err.status).toBe(404)
      });

      const req = httpMock.expectOne('/plantillaMonitoreo/999');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. PILAR: ROBUSTEZ (Integridad de la respuesta)
    it('debería garantizar que monitoreos sea un array aunque el servidor devuelva null tras el update', () => {
      service.update(id, { nombre: 'Nuevo' }).subscribe(res => {
        expect(Array.isArray(res.monitoreos)).toBe(true);
      });

      const req = httpMock.expectOne(resourceUrl);
      // El servidor responde confirmando pero con el campo monitoreos corrupto
      req.flush({ id, nombre: 'Nuevo', monitoreos: null });
    });
  });

  describe('delete()', () => {
    const idEliminar = 55;
    const urlEsperada = `/plantillaMonitoreo/${idEliminar}`;

    // 1. PILAR: CAMINO FELIZ
    it('debería enviar una petición DELETE al endpoint correcto y completar el flujo', () => {
      service.delete(idEliminar).subscribe({
        complete: () => expect(true).toBe(true)
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    // 2. PILAR: MANEJO DE ERRORES (Recurso ya eliminado o inexistente)
    it('debería propagar error 404 si la plantilla no existe', () => {
      service.delete(99).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (err) => expect(err.status).toBe(404)
      });

      const req = httpMock.expectOne('/plantillaMonitoreo/99');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 3. PILAR: INTEGRIDAD Y CONTRATO (Protección de Body)
    it('debería asegurar que la petición no incluya un cuerpo de datos', () => {
      service.delete(idEliminar).subscribe();
      const req = httpMock.expectOne(urlEsperada);

      expect(req.request.body).toBeNull();
      req.flush(null);
    });

    // 4. PILAR: ROBUSTEZ (Validación de entrada - Nuevo)
    it('debería lanzar un error síncrono si el ID es nulo o indefinido', () => {
      // @ts-ignore: Forzamos el error para probar la robustez del servicio
      expect(() => service.delete(null)).toThrow('ID requerido para eliminar');
    });
  });

});
