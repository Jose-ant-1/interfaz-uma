import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting, HttpTestingController} from '@angular/common/http/testing';
import {PaginaService} from './pagina.service';
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {Pagina} from '../models/pagina.model';

describe('PaginaService', () => {
  let service: PaginaService;
  let httpMock: HttpTestingController;
  const resource = '/paginas';

  beforeEach(() => {
    // Limpiamos el TestBed explícitamente si es necesario
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        PaginaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PaginaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getPaginas()', () => {
    const resource = '/paginas';

    // 1. CAMINO FELIZ: Verificación de flujo estándar
    it('debería retornar una colección de páginas cuando el servidor responde con éxito', () => {
      const mockPaginas: Pagina[] = [
        {id: 1, nombre: 'Inicio', url: '/home', notaInfo: 'Página principal'},
        {id: 2, nombre: 'Contacto', url: '/contact'}
      ];

      service.getPaginas().subscribe({
        next: (paginas) => {
          expect(paginas.length).toBe(2);
          expect(paginas[0].nombre).toBe('Inicio');
          expect(paginas).toEqual(mockPaginas);
        }
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginas);
    });

    // 2. CASO DE BORDE: Respuesta vacía
    it('debería manejar correctamente una respuesta de array vacío', () => {
      service.getPaginas().subscribe({
        next: (paginas) => {
          expect(paginas.length).toBe(0);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES: Fallo de red (Pilar 3)
    it('debería propagar el error si el servidor falla (500)', () => {
      service.getPaginas().subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Error de servidor', {status: 500, statusText: 'Internal Server Error'});
    });

    // 4. INTEGRIDAD TÉCNICA: Mapeo de datos corruptos (Pilar 4 y 6)
    it('debería aplicar valores por defecto si los datos del servidor son incompletos', () => {
      const mockCorrupto = [
        {id: 3} // Falta nombre y url
      ];

      service.getPaginas().subscribe({
        next: (paginas) => {
          expect(paginas[0].nombre).toBe('Sin nombre');
          expect(paginas[0].url).toBe('#');
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush(mockCorrupto);
    });
  });

  describe('getPaginaById()', () => {
    const idExistente = 1;

    // 1. CAMINO FELIZ: Obtención exitosa
    it('debería retornar los detalles de una página específica por su ID', () => {
      const mockPagina: Pagina = {
        id: idExistente,
        nombre: 'Detalle',
        url: '/detalle'
      };

      service.getPaginaById(idExistente).subscribe({
        next: (pagina) => {
          expect(pagina.id).toBe(idExistente);
          expect(pagina.nombre).toBe('Detalle');
        }
      });

      const req = httpMock.expectOne(`${resource}/${idExistente}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPagina);
    });

    // 2. CASO DE BORDE: IDs extremos (0 o negativos)
    it('debería realizar la petición correctamente incluso con ID 0', () => {
      const idCero = 0;
      service.getPaginaById(idCero).subscribe();

      const req = httpMock.expectOne(`${resource}/${idCero}`);
      expect(req.request.method).toBe('GET'); // Pilar 4: Verificación de contrato
      req.flush({id: 0, nombre: 'Cero', url: '/0'});
    });

    // 3. MANEJO DE ERRORES: Recurso no encontrado (404)
    it('debería propagar error 404 si la página no existe', () => {
      service.getPaginaById(999).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${resource}/999`);
      req.flush('Not Found', {status: 404, statusText: 'Not Found'});
    });

    // 4. INTEGRIDAD TÉCNICA: Datos parciales del servidor (Pilar 4 y 6)
    it('debería completar campos faltantes mediante el mapeo de seguridad', () => {
      const mockIncompleto = {id: idExistente}; // Faltan nombre y url

      service.getPaginaById(idExistente).subscribe({
        next: (pagina) => {
          expect(pagina.nombre).toBe('Página sin nombre');
          expect(pagina.url).toBe('#');
        }
      });

      const req = httpMock.expectOne(`${resource}/${idExistente}`);
      req.flush(mockIncompleto);
    });
  });

  describe('buscarPaginas()', () => {
    const resource = '/paginas';

    // 1. CAMINO FELIZ: Búsqueda con éxito
    it('debería retornar resultados filtrados cuando se proporciona un término', () => {
      const mockResultados: Pagina[] = [
        { id: 1, nombre: 'Resultado 1', url: '/res1' }
      ];
      const termino = 'test';

      service.buscarPaginas(termino).subscribe({
        next: (res) => {
          expect(res.length).toBe(1);
          expect(res[0].nombre).toBe('Resultado 1');
        }
      });

      // Verificamos la URL con el query param
      const req = httpMock.expectOne(`${resource}/buscar?q=${termino}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResultados);
    });

    // 2. CASO DE BORDE: Término vacío o con espacios (Pilar 2 y 5)
    it('debería llamar a getPaginas() (URL base) si el término solo contiene espacios', () => {
      service.buscarPaginas('   ').subscribe();

      // Al estar vacío tras el trim, debe ir a /paginas, no a /paginas/buscar
      const req = httpMock.expectOne(resource);
      expect(req.request.url).not.toContain('buscar');
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES: Error de búsqueda (Pilar 3)
    it('debería propagar el error si el motor de búsqueda falla', () => {
      service.buscarPaginas('error').subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (err) => {
          expect(err.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${resource}/buscar?q=error`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });

    // 4. INTEGRIDAD TÉCNICA: Saneamiento de resultados (Pilar 4 y 6)
    it('debería asegurar que cada resultado de búsqueda tenga nombre y url aunque el server envíe nulos', () => {
      const mockSucio = [{ id: 5 }]; // Viene sin nombre ni url

      service.buscarPaginas('sucio').subscribe({
        next: (res) => {
          expect(res[0].nombre).toBe('Sin nombre');
          expect(res[0].url).toBe('#');
        }
      });

      const req = httpMock.expectOne(`${resource}/buscar?q=sucio`);
      req.flush(mockSucio);
    });
  });

  describe('createPagina()', () => {
    const resource = '/paginas';
    const paginaPayload: Partial<Pagina> = { nombre: '  Nueva  ', url: '/nueva' };

    // 1. CAMINO FELIZ: Creación exitosa
    it('debería enviar una petición POST y retornar la página creada con su ID', () => {
      const mockCreada: Pagina = { id: 10, nombre: 'Nueva', url: '/nueva' };

      service.createPagina(paginaPayload).subscribe({
        next: (res) => {
          expect(res.id).toBe(10);
          expect(res.nombre).toBe('Nueva');
        }
      });

      const req = httpMock.expectOne(resource);
      expect(req.request.method).toBe('POST');
      // Pilar 5: Verificamos que se envió con trim()
      expect(req.request.body.nombre).toBe('Nueva');
      req.flush(mockCreada);
    });

    // 2. CASO DE BORDE: Payload mínimo (Pilar 2)
    it('debería asignar valores por defecto si el payload está casi vacío', () => {
      service.createPagina({}).subscribe({
        next: (res) => {
          expect(res.nombre).toBe('Nueva Página');
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush({ id: 11, nombre: 'Nueva Página', url: '#' });
    });

    // 3. MANEJO DE ERRORES: Error de validación del servidor (400)
    it('debería propagar error 400 si los datos son inválidos para el servidor', () => {
      service.createPagina(paginaPayload).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (err) => {
          expect(err.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD: Consistencia de datos (Pilar 4)
    it('debería asegurar que la respuesta del servidor sea íntegra aunque falten campos', () => {
      const mockIncompleto = { id: 12 }; // El servidor olvida devolver el nombre

      service.createPagina({ nombre: 'Test Integrity' }).subscribe({
        next: (res) => {
          expect(res.nombre).toBe('Test Integrity'); // Recuperado del mapeo de seguridad
          expect(res.id).toBe(12);
        }
      });

      const req = httpMock.expectOne(resource);
      req.flush(mockIncompleto);
    });
  });

  describe('updatePagina()', () => {
    const idExistente = 1;
    const resourceUrl = `/paginas/${idExistente}`;

    // 1. CAMINO FELIZ: Actualización exitosa
    it('debería enviar un PUT con los datos limpios y retornar el objeto actualizado', () => {
      const cambios: Partial<Pagina> = { nombre: '  Nombre Nuevo  ' };
      const mockRespuesta: Pagina = { id: idExistente, nombre: 'Nombre Nuevo', url: '/url' };

      service.updatePagina(idExistente, cambios).subscribe({
        next: (res) => {
          expect(res.nombre).toBe('Nombre Nuevo');
          expect(res.id).toBe(idExistente);
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      expect(req.request.method).toBe('PUT');
      // Verificamos Pilar 5: Sanitización en el cuerpo del envío
      expect(req.request.body.nombre).toBe('Nombre Nuevo');
      req.flush(mockRespuesta);
    });

    // 2. CASO DE BORDE: Actualización parcial o mínima (Pilar 2)
    it('debería funcionar correctamente enviando un objeto vacío', () => {
      service.updatePagina(idExistente, {}).subscribe();

      const req = httpMock.expectOne(resourceUrl);
      expect(req.request.body).toEqual({});
      req.flush({ id: idExistente, nombre: 'Sin cambios', url: '/sin-cambios' });
    });

    // 3. MANEJO DE ERRORES: ID inexistente (404)
    it('debería propagar error 404 si el ID no existe en el servidor', () => {
      service.updatePagina(999, { nombre: 'Test' }).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (err) => {
          expect(err.status).toBe(404);
        }
      });

      const req = httpMock.expectOne('/paginas/999');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD: Sincronización de la respuesta (Pilar 4 y 6)
    it('debería asegurar que la respuesta sea válida aunque el servidor no devuelva todos los campos', () => {
      service.updatePagina(idExistente, { url: '/nueva-url' }).subscribe({
        next: (res) => {
          expect(res.url).toBe('/nueva-url');
          expect(res.nombre).toBeDefined(); // Pilar 6: El mapeo garantiza un valor
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      req.flush({ id: idExistente, url: '/nueva-url' }); // El server no devuelve el nombre
    });
  });

  describe('deletePagina()', () => {
    const idEliminar = 1;
    const resourceUrl = `/paginas/${idEliminar}`;

    // 1. CAMINO FELIZ: Borrado exitoso
    it('debería enviar una petición DELETE al recurso correcto', () => {
      service.deletePagina(idEliminar).subscribe({
        next: () => {
          // Si llega aquí, la petición fue exitosa
          expect(true).toBe(true);
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      expect(req.request.method).toBe('DELETE');
      req.flush(null); // El servidor suele responder con 200 o 204
    });

    // 2. CASO DE BORDE: ID extremo (Pilar 2)
    it('debería permitir el borrado con ID 0 si el sistema lo requiere', () => {
      service.deletePagina(0).subscribe();

      const req = httpMock.expectOne('/paginas/0');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    // 3. MANEJO DE ERRORES: Error de servidor (500) o No encontrado (404)
    it('debería propagar el error si el servidor falla al eliminar', () => {
      service.deletePagina(idEliminar).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (err) => {
          expect(err.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(resourceUrl);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    });

    // 4. INTEGRIDAD: Validación de parámetros (Pilar 4)
    it('debería lanzar un error síncrono si el ID es nulo o indefinido', () => {
      // @ts-ignore: Probando robustez ante fallos de tipado
      expect(() => service.deletePagina(null)).toThrow('Se requiere un ID válido');
    });
  });

});
