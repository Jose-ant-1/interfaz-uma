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

  describe('findAll()', () => {

    // 1. CAMINO FELIZ (Happy Path)
    it('debería retornar una lista de plantillas de usuario cuando la API responde con éxito', () => {
      const mockPlantillas: PlantillaUsuario[] = [
        { id: 1, nombre: 'Plantilla Usuario A' } as PlantillaUsuario,
        { id: 2, nombre: 'Plantilla Usuario B' } as PlantillaUsuario
      ];

      service.findAll().subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data).toEqual(mockPlantillas);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('GET');
      req.flush(mockPlantillas);
    });

    // 2. CASO DE BORDE (Edge Case)
    it('debería manejar correctamente una respuesta de lista vacía []', () => {
      service.findAll().subscribe((data) => {
        expect(data).toEqual([]);
        expect(data.length).toBe(0);
      });

      const req = httpMock.expectOne(resource);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES (Error Handling)
    it('debería propagar el error si el servidor devuelve un fallo 500', () => {
      service.findAll().subscribe({
        next: () => expect.fail('La petición debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Error interno', { status: 500, statusText: 'Internal Server Error' });
    });

    // 4. INTEGRIDAD Y CONTRATO
    it('debería realizar la petición exactamente al recurso base sin parámetros adicionales', () => {
      service.findAll().subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.url).toBe(resource);
      // Validamos que no se envíen query params por error
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });
  });

  describe('findById()', () => {
    const idBusqueda = 123;
    const urlEsperada = `${resource}/${idBusqueda}`;

    // 1. CAMINO FELIZ
    it('debería retornar una plantilla específica cuando el ID existe', () => {
      const mockPlantilla: PlantillaUsuario = {
        id: idBusqueda,
        nombre: 'Plantilla VIP'
      } as PlantillaUsuario;

      service.findById(idBusqueda).subscribe((data) => {
        expect(data.id).toBe(idBusqueda);
        expect(data.nombre).toBe('Plantilla VIP');
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('GET');
      req.flush(mockPlantilla);
    });

    // 2. CASO DE BORDE
    it('debería manejar correctamente IDs grandes o inusuales en la URL', () => {
      const idGrande = 999999;
      service.findById(idGrande).subscribe();

      const req = httpMock.expectOne(`${resource}/${idGrande}`);
      expect(req.request.url).toContain('999999');
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 404 cuando la plantilla de usuario no existe', () => {
      service.findById(idBusqueda).subscribe({
        next: () => expect.fail('Debería haber fallado con 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición se envía mediante el método GET', () => {
      service.findById(idBusqueda).subscribe();
      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('create()', () => {
    const nuevaPlantilla: Partial<PlantillaUsuario> = {
      nombre: 'Nueva Plantilla de Test'
    };

    // 1. CAMINO FELIZ
    it('debería crear una nueva plantilla y retornar el objeto creado con su ID', () => {
      const mockResponse: PlantillaUsuario = {
        id: 50,
        nombre: 'Nueva Plantilla de Test'
      } as PlantillaUsuario;

      service.create(nuevaPlantilla).subscribe((res) => {
        expect(res.id).toBe(50);
        expect(res.nombre).toBe(nuevaPlantilla.nombre);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevaPlantilla); // Verificamos integridad del envío
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE
    it('debería funcionar correctamente enviando un objeto vacío si el modelo lo permite', () => {
      service.create({}).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar el error 400 si el servidor rechaza los datos por falta de campos', () => {
      service.create(nuevaPlantilla).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición es de tipo POST y no añade parámetros a la URL', () => {
      service.create(nuevaPlantilla).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      expect(req.request.url).toBe(resource);
      req.flush({});
    });
  });

  describe('update()', () => {
    const idUpdate = 77;
    const urlEsperada = `${resource}/${idUpdate}`;
    const mockUpdate: Partial<PlantillaUsuario> = { nombre: 'Nombre Actualizado' };

    // 1. CAMINO FELIZ
    it('debería actualizar una plantilla existente y retornar el resultado', () => {
      service.update(idUpdate, mockUpdate).subscribe(res => {
        expect(res.nombre).toBe(mockUpdate.nombre);
        expect(res.id).toBe(idUpdate);
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockUpdate);
      req.flush({ id: idUpdate, ...mockUpdate });
    });

    // 2. CASO DE BORDE
    it('debería permitir actualizaciones enviando un objeto vacío', () => {
      service.update(idUpdate, {}).subscribe();

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar el error 403 si el usuario no tiene permisos para editar', () => {
      service.update(idUpdate, mockUpdate).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(403)
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que el ID en la URL es el correcto independientemente del contenido del body', () => {
      const idErroneo = 999;
      service.update(idErroneo, mockUpdate).subscribe();

      const req = httpMock.expectOne(`${resource}/${idErroneo}`);
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });
  });

  describe('delete()', () => {
    const idDelete = 10;
    const urlEsperada = `${resource}/${idDelete}`;

    // 1. CAMINO FELIZ
    it('debería eliminar la plantilla y confirmar con una respuesta vacía', () => {
      let llamado = false;
      service.delete(idDelete).subscribe({
        next: (res) => {
          expect(res).toBeNull(); // Aserción explícita para SonarQube
          llamado = true;
        }
      });

      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(llamado).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería manejar la eliminación de un ID de valor 0', () => {
      let llamado = false;
      service.delete(0).subscribe(() => llamado = true);

      const req = httpMock.expectOne(`${resource}/0`);
      req.flush(null);
      expect(llamado).toBe(true);
    });

    // 3. MANEJO DE ERRORES
    it('debería propagar error 404 si la plantilla ya no existe para ser borrada', () => {
      service.delete(idDelete).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (e) => expect(e.status).toBe(404)
      });

      const req = httpMock.expectOne(urlEsperada);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición DELETE no lleva cuerpo (body)', () => {
      service.delete(idDelete).subscribe();
      const req = httpMock.expectOne(urlEsperada);
      expect(req.request.body).toBeNull();
      req.flush(null);
    });
  });

});
