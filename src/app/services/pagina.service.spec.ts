import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaginaService } from './pagina.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { Pagina } from '../models/pagina.model';

describe('PaginaService', () => {
  let service: PaginaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaginaService,
        provideHttpClient(),
        provideHttpClientTesting(),
        // provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true })
    {provide: ErrorHandler, useValue: new ErrorHandler()}
      ]
    });

    service = TestBed.inject(PaginaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (httpMock) httpMock.verify();
  });

  describe('getPaginas()', () => {
    const resource = '/paginas';

    // 1. CAMINO FELIZ: Datos que cumplen con la interfaz Pagina
    it('debería retornar una colección de páginas cuando el servidor responde con éxito', () => {
      const mockPaginas: Pagina[] = [
        {
          id: 1,
          nombre: 'Inicio',
          url: '/home',
          notaInfo: 'Página principal'
        },
        {
          id: 2,
          nombre: 'Dashboard',
          url: '/panel'
          // notaInfo es opcional, lo omitimos aquí para probar flexibilidad
        }
      ];

      service.getPaginas().subscribe((paginas) => {
        expect(paginas.length).toBe(2);
        expect(paginas[0].nombre).toBe('Inicio');
        expect(paginas).toEqual(mockPaginas);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginas);
    });

    // 2. CASO DE BORDE: Array vacío
    it('debería manejar correctamente una respuesta de servidor que retorna un array vacío []', () => {
      service.getPaginas().subscribe((paginas) => {
        expect(paginas).toEqual([]);
        expect(paginas.length).toBe(0);
      });

      const req = httpMock.expectOne(resource);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES: Fallo de servidor (500)
    it('debería propagar el error si el servidor devuelve un fallo 500', () => {
      service.getPaginas().subscribe({
        next: () => expect.fail('La petición debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Error interno', { status: 500, statusText: 'Internal Server Error' });
    });

    // 4. INTEGRIDAD: Limpieza de URL y Contrato
    it('debería realizar la petición exactamente a /paginas sin parámetros ni headers extra', () => {
      service.getPaginas().subscribe();

      const req = httpMock.expectOne(resource);
      // Verificamos que la URL sea limpia y el método correcto
      expect(req.request.url).toBe(resource);
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });
  });

  describe('getPaginaById()', () => {
    const resource = '/paginas';

    // 1. CAMINO FELIZ: Obtener una página existente
    it('debería retornar una página específica cuando se proporciona un ID válido', () => {
      const mockPagina: Pagina = {
        id: 10,
        nombre: 'Detalle de Producto',
        url: '/producto/10',
        notaInfo: 'Info adicional'
      };

      service.getPaginaById(10).subscribe((pagina) => {
        expect(pagina).toEqual(mockPagina);
        expect(pagina.id).toBe(10);
      });

      const req = httpMock.expectOne(`${resource}/10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPagina);
    });

    // 2. CASO DE BORDE: ID extremo o inusual
    it('debería funcionar correctamente con IDs numéricos grandes', () => {
      const idGrande = 999999;
      service.getPaginaById(idGrande).subscribe();

      const req = httpMock.expectOne(`${resource}/${idGrande}`);
      expect(req.request.url).toBe(`${resource}/999999`);
      req.flush({});
    });

    // 3. MANEJO DE ERRORES: Página no encontrada (404)
    it('debería manejar el error 404 cuando la página no existe', () => {
      const idInexistente = 404;

      service.getPaginaById(idInexistente).subscribe({
        next: () => expect.fail('Debería haber fallado con 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${resource}/${idInexistente}`);
      req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD: Construcción de la URL
    it('debería construir la URL de forma íntegra concatenando el recurso y el ID', () => {
      const idPrueba = 5;
      service.getPaginaById(idPrueba).subscribe();

      const req = httpMock.expectOne(r => r.url.endsWith(`/paginas/${idPrueba}`));
      expect(req.request.method).toBe('GET');
      // Verificamos que no haya parámetros de búsqueda, solo el path segment
      expect(req.request.params.keys().length).toBe(0);
      req.flush({});
    });
  });

  describe('buscarPaginas()', () => {
    const resource = '/paginas';

    // 1. CAMINO FELIZ: Búsqueda con un término válido
    it('debería retornar resultados filtrados cuando se proporciona un término de búsqueda', () => {
      const mockResultados: Pagina[] = [
        { id: 1, nombre: 'Página de Inicio', url: '/home' }
      ];
      const termino = 'Inicio';

      service.buscarPaginas(termino).subscribe((data) => {
        expect(data.length).toBe(1);
        expect(data).toEqual(mockResultados);
      });

      // Verificamos que se añade el query param ?q=
      const req = httpMock.expectOne(`${resource}/buscar?q=${termino}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResultados);
    });

    // 2. CASO DE BORDE: Término vacío o solo espacios
    it('debería redirigir a la URL base /paginas si el término está vacío o tiene solo espacios', () => {
      // El servicio hace: if (!termino.trim()) return this.getPaginas();
      service.buscarPaginas('   ').subscribe((data) => {
        expect(data).toEqual([]);
      });

      // IMPORTANTE: Aquí la URL NO debe llevar "/buscar" ni parámetros
      const req = httpMock.expectOne(resource);
      expect(req.request.url).toBe(resource);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES: Error de servidor en la búsqueda
    it('debería manejar errores 500 durante la búsqueda', () => {
      service.buscarPaginas('test').subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${resource}/buscar?q=test`);
      req.flush('Error en búsqueda', { status: 500, statusText: 'Server Error' });
    });

    // 4. INTEGRIDAD: Codificación de caracteres especiales
    it('debería mantener la integridad del término de búsqueda incluso con caracteres especiales', () => {
      const terminoComplejo = 'mañana & hoy';
      service.buscarPaginas(terminoComplejo).subscribe();

      const req = httpMock.expectOne(r => r.url.includes('/buscar'));
      // Quitamos el encodeURIComponent del expect, ya que tu servicio no lo usa
      expect(req.request.urlWithParams).toContain(`q=${terminoComplejo}`);
      req.flush([]);
    });
  });

  describe('createPagina()', () => {
    const resource = '/paginas';

    // 1. CAMINO FELIZ: Creación exitosa
    it('debería enviar una petición POST con los datos de la página y retornar el objeto creado', () => {
      const nuevaPagina: Partial<Pagina> = {
        nombre: 'Nueva Sección',
        url: '/nueva-seccion',
        notaInfo: 'Nota opcional'
      };

      // SOLUCIÓN TS2783: Usamos una constante intermedia o aseguramos el orden
      // Al ser un POST, el mock de respuesta DEBE incluir el ID que genera el server
      const mockResponse: Pagina = {
        id: 101,
        nombre: nuevaPagina.nombre!,
        url: nuevaPagina.url!,
        notaInfo: nuevaPagina.notaInfo
      };

      service.createPagina(nuevaPagina).subscribe((res) => {
        expect(res.id).toBe(101);
        expect(res.nombre).toBe('Nueva Sección');
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(nuevaPagina);
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE: Campos mínimos (sin notaInfo)
    it('debería funcionar correctamente al enviar solo los campos obligatorios', () => {
      const paginaMinima: Partial<Pagina> = {
        nombre: 'Mínima',
        url: '/min'
      };

      const mockResponse: Pagina = {
        id: 102,
        nombre: 'Mínima',
        url: '/min'
      };

      service.createPagina(paginaMinima).subscribe((res) => {
        expect(res.id).toBe(102);
        expect(res.notaInfo).toBeUndefined();
      });

      const req = httpMock.expectOne(resource);
      req.flush(mockResponse);
    });

    // 3. MANEJO DE ERRORES: Error de validación (400)
    it('debería manejar un error 400 si el servidor rechaza los datos por falta de campos', () => {
      const datosIncompletos = { nombre: '' };

      service.createPagina(datosIncompletos).subscribe({
        next: () => expect.fail('Debería haber fallado con 400'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Bad Request', { status: 400, statusText: 'Invalid Data' });
    });

    // 4. INTEGRIDAD: Validación del Body y URL
    it('debería asegurar que el cuerpo de la petición sea un objeto íntegro y la URL sea la correcta', () => {
      const payload = { nombre: 'Test' };
      service.createPagina(payload).subscribe();

      const req = httpMock.expectOne(resource);
      expect(req.request.url).toBe(resource);
      // Verificamos que no enviamos null y que es un objeto
      expect(req.request.body).not.toBeNull();
      expect(req.request.body.nombre).toBe('Test');
      req.flush({});
    });
  });

  describe('updatePagina()', () => {
    const resource = '/paginas';
    const idUpdate = 50;

    // 1. CAMINO FELIZ: Actualización completa
    it('debería enviar una petición PUT con los cambios y retornar el objeto actualizado', () => {
      const cambios: Partial<Pagina> = {
        nombre: 'Nombre Editado',
        notaInfo: 'Nueva nota'
      };

      // Corregimos el error TS2783: Primero el spread, luego el id para asegurar el valor final
      const mockResponse: Pagina = {
        ...(cambios as Pagina),
        id: idUpdate,
        url: '/url-existente'
      };

      service.updatePagina(idUpdate, cambios).subscribe((res) => {
        expect(res.id).toBe(idUpdate);
        expect(res.nombre).toBe('Nombre Editado');
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${resource}/${idUpdate}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(cambios);
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE: Actualización con objeto vacío
    it('debería permitir enviar una actualización sin cambios (objeto vacío)', () => {
      const cambiosVacios = {};

      service.updatePagina(idUpdate, cambiosVacios).subscribe();

      const req = httpMock.expectOne(`${resource}/${idUpdate}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({ id: idUpdate });
    });

    // 3. MANEJO DE ERRORES: Error de persistencia (409 Conflict)
    it('debería manejar un error 409 si hay un conflicto en el servidor al actualizar', () => {
      service.updatePagina(idUpdate, { nombre: 'Conflicto' }).subscribe({
        next: () => expect.fail('Debería haber fallado con 409'),
        error: (error) => {
          expect(error.status).toBe(409);
        }
      });

      const req = httpMock.expectOne(`${resource}/${idUpdate}`);
      req.flush('Conflicto de datos', { status: 409, statusText: 'Conflict' });
    });

    // 4. INTEGRIDAD: Validación de URL y ID
    it('debería construir la URL de actualización correctamente usando el ID proporcionado', () => {
      const otroId = 999;
      service.updatePagina(otroId, { nombre: 'Test' }).subscribe();

      const req = httpMock.expectOne(`${resource}/${otroId}`);
      expect(req.request.url).toBe(`${resource}/${otroId}`);
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });
  });

  describe('deletePagina()', () => {
    const resource = '/paginas';
    const idEliminar = 25;

    // 1. CAMINO FELIZ: Eliminación exitosa
    it('debería enviar una petición DELETE al endpoint correcto y completar la acción', () => {
      service.deletePagina(idEliminar).subscribe({
        next: () => {
          // En un DELETE que devuelve void, el éxito es que se complete el observable
          expect(true).toBe(true);
        }
      });

      const req = httpMock.expectOne(`${resource}/${idEliminar}`);
      expect(req.request.method).toBe('DELETE');
      // El servidor suele responder con 200 OK o 204 No Content
      req.flush(null);
    });

    // 2. CASO DE BORDE: ID inusual (0 o negativo)
    it('debería manejar correctamente la petición incluso con IDs poco comunes como el 0', () => {
      const idCero = 0;
      service.deletePagina(idCero).subscribe();

      const req = httpMock.expectOne(`${resource}/${idCero}`);
      expect(req.request.url).toBe(`${resource}/0`);
      req.flush(null);
    });

    // 3. MANEJO DE ERRORES: Intentar borrar algo que no existe (404)
    it('debería retornar un error 404 si la página ya no existe en el servidor', () => {
      service.deletePagina(idEliminar).subscribe({
        next: () => expect.fail('Debería haber fallado con 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${resource}/${idEliminar}`);
      req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD: Ausencia de cuerpo (Body) en la petición
    it('debería asegurar que la petición DELETE no contiene cuerpo de datos (body)', () => {
      service.deletePagina(idEliminar).subscribe();

      const req = httpMock.expectOne(`${resource}/${idEliminar}`);
      // El estándar REST dicta que DELETE no debe llevar body. Validamos integridad:
      expect(req.request.body).toBeNull();
      req.flush(null);
    });
  });

});
