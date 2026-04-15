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

    // 1. CAMINO FELIZ (Happy Path)
    it('debería retornar una lista de plantillas cuando la API responde con éxito', () => {
      // He quitado 'comando' y he usado un casting más flexible para evitar el error TS2352
      const mockPlantillas = [
        { id: 1, nombre: 'Plantilla A' },
        { id: 2, nombre: 'Plantilla B' }
      ] as unknown as PlantillaMonitoreo[];

      service.findAll().subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data).toEqual(mockPlantillas);
      });

      const req = httpMock.expectOne('/plantillaMonitoreo');
      expect(req.request.method).toBe('GET');
      req.flush(mockPlantillas);
    });

    // 2. CASO DE BORDE (Edge Case)
    it('debería manejar correctamente una respuesta de lista vacía []', () => {
      service.findAll().subscribe((data) => {
        expect(data.length).toBe(0);
        expect(data).toEqual([]);
      });

      const req = httpMock.expectOne('/plantillaMonitoreo');
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES (Error Handling)
    it('debería lanzar un error si la API devuelve un fallo 500', () => {
      service.findAll().subscribe({
        // CORRECCIÓN: Usamos expect.fail() en lugar de fail()
        next: () => expect.fail('Debería haber fallado con un error 500'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/plantillaMonitoreo');
      req.flush('Error del servidor', { status: 500, statusText: 'Server Error' });
    });

    // 4. INTEGRIDAD Y CONTRATO
    it('debería llamar a la URL exacta definida en el recurso sin parámetros extra', () => {
      service.findAll().subscribe();

      const req = httpMock.expectOne('/plantillaMonitoreo');
      expect(req.request.url).toBe('/plantillaMonitoreo');
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });
  });

  describe('findByPropietario()', () => {
    const usuarioId = 123;
    const urlEsperada = `/plantillaMonitoreo/propietario/${usuarioId}`;

    // 1. CAMINO FELIZ (Happy Path)
    it('debería retornar las plantillas de un propietario específico', () => {
      const mockPlantillas = [
        { id: 1, nombre: 'Plantilla Propietario', usuarioId: 123 }
      ] as unknown as PlantillaMonitoreo[];

      service.findByPropietario(usuarioId).subscribe((data) => {
        expect(data.length).toBe(1);
        expect(data[0].id).toBe(1);
        expect(data).toEqual(mockPlantillas);
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('GET');
      req.flush(mockPlantillas);
    });

    // 2. CASO DE BORDE (Edge Case)
    it('debería retornar un array vacío si el propietario no tiene plantillas', () => {
      service.findByPropietario(usuarioId).subscribe((data) => {
        expect(data.length).toBe(0);
        expect(data).toEqual([]);
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush([]); // Simula que el usuario existe pero no tiene registros
    });

    // 3. MANEJO DE ERRORES (Error Handling)
    it('debería manejar un error 404 si el usuarioId no existe', () => {
      service.findByPropietario(999).subscribe({
        next: () => expect.fail('Debería haber fallado con 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne('/plantillaMonitoreo/propietario/999');
      req.flush('Usuario no encontrado', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD Y CONTRATO
    it('debería formatear la URL correctamente con el ID de usuario proporcionado', () => {
      const distintoId = 456;
      service.findByPropietario(distintoId).subscribe();

      // Verificamos que el ID se inyecte correctamente en el path
      const req = httpMock.expectOne(`/plantillaMonitoreo/propietario/${distintoId}`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('create()', () => {
    // CORRECCIÓN: Usamos casting para que acepte propiedades que no están en la interfaz
    const nuevaPlantilla = {
      nombre: 'Nueva Plantilla',
      comando: 'check_http'
    } as unknown as Partial<PlantillaMonitoreo>;

    // 1. CAMINO FELIZ
    it('debería enviar un POST y retornar la plantilla creada con su ID', () => {
      const mockResponse = { id: 10, ...nuevaPlantilla } as unknown as PlantillaMonitoreo;

      service.create(nuevaPlantilla).subscribe((res) => {
        expect(res.id).toBe(10);
        expect(res.nombre).toBe('Nueva Plantilla');
      });

      const req = httpMock.expectOne('/plantillaMonitoreo');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevaPlantilla);
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE
    it('debería funcionar correctamente al enviar una plantilla con campos mínimos', () => {
      const plantillaMinima = { nombre: 'Mínima' } as unknown as Partial<PlantillaMonitoreo>;
      const mockResponse = { id: 11, nombre: 'Mínima' } as unknown as PlantillaMonitoreo;

      service.create(plantillaMinima).subscribe((res) => {
        expect(res.id).toBe(11);
      });

      const req = httpMock.expectOne('/plantillaMonitoreo');
      req.flush(mockResponse);
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 400 si los datos enviados no son válidos', () => {
      service.create({}).subscribe({
        next: () => expect.fail('Debería haber fallado con 400'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne('/plantillaMonitoreo');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que el cuerpo de la petición sea un objeto válido', () => {
      service.create(nuevaPlantilla).subscribe();

      const req = httpMock.expectOne('/plantillaMonitoreo');
      expect(typeof req.request.body).toBe('object');
      expect(req.request.body.nombre).toBe('Nueva Plantilla');
      req.flush({});
    });
  });

  describe('update()', () => {
    const idUpdate = 1;
    const cambios = {
      nombre: 'Plantilla Modificada',
      comando: 'check_ssh'
    } as unknown as Partial<PlantillaMonitoreo>;

    // 1. CAMINO FELIZ (Happy Path)
    it('debería enviar un PUT con los cambios y retornar el objeto actualizado', () => {
      const mockResponse = { id: idUpdate, ...cambios } as unknown as PlantillaMonitoreo;

      service.update(idUpdate, cambios).subscribe((res) => {
        expect(res.id).toBe(idUpdate);
        expect(res.nombre).toBe('Plantilla Modificada');
      });

      const req = httpMock.expectOne(`/plantillaMonitoreo/${idUpdate}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(cambios);
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE (Edge Case)
    it('debería permitir actualizaciones con un objeto vacío', () => {
      const cambiosVacios = {} as Partial<PlantillaMonitoreo>;

      service.update(idUpdate, cambiosVacios).subscribe();

      const req = httpMock.expectOne(`/plantillaMonitoreo/${idUpdate}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    // 3. MANEJO DE ERRORES (Error Handling)
    it('debería manejar un error 403 si el usuario no tiene permisos para editar', () => {
      service.update(idUpdate, cambios).subscribe({
        next: () => expect.fail('Debería haber fallado con 403'),
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`/plantillaMonitoreo/${idUpdate}`);
      req.flush('Prohibido', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD Y CONTRATO
    it('debería construir la URL de actualización correctamente con el ID', () => {
      const otroId = 99;
      service.update(otroId, {}).subscribe();

      const req = httpMock.expectOne(`/plantillaMonitoreo/${otroId}`);
      expect(req.request.url).toContain(`/plantillaMonitoreo/${otroId}`);
      req.flush({});
    });
  });

  describe('delete()', () => {
    const idEliminar = 55;
    const urlEsperada = `/plantillaMonitoreo/${idEliminar}`;

    // 1. CAMINO FELIZ (Happy Path)
    it('debería enviar una petición DELETE al endpoint correcto', () => {
      service.delete(idEliminar).subscribe(() => {
        // En un delete exitoso, simplemente esperamos que se complete
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('DELETE');
      req.flush(null); // El servidor suele responder con 200 OK o 204 No Content (null)
    });

    // 2. CASO DE BORDE (Edge Case)
    it('debería funcionar correctamente con IDs grandes o inusuales', () => {
      const idGrande = 999999;
      service.delete(idGrande).subscribe();

      const req = httpMock.expectOne(`/plantillaMonitoreo/${idGrande}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    // 3. MANEJO DE ERRORES (Error Handling)
    it('debería retornar error 404 si la plantilla ya no existe', () => {
      service.delete(idEliminar).subscribe({
        next: () => expect.fail('Debería haber fallado con 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD Y CONTRATO
    it('debería asegurar que no se envía cuerpo (body) en la petición DELETE', () => {
      service.delete(idEliminar).subscribe();

      const req = httpMock.expectOne(urlEsperada);
      // Por estándar, DELETE no suele llevar body
      expect(req.request.body).toBeNull();
      req.flush(null);
    });
  });

});
