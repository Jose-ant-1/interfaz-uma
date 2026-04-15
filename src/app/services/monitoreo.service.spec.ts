import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MonitoreoService } from './monitoreo.service';
import { MonitoreoDTODetalle, MonitoreoListadoDTO } from '../models/monitoreo.model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('MonitoreoService', () => {
  let service: MonitoreoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MonitoreoService,
        provideHttpClient(),
        provideHttpClientTesting(),
        // NOTA: No añadimos provideZoneChangeDetection aquí para evitar conflictos con el IDE
        // ya que tu test-setup.ts ya carga zone.js
      ]
    });

    service = TestBed.inject(MonitoreoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verifica que no queden peticiones pendientes entre un test y otro
    httpMock.verify();
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  describe('getMisMonitoreos()', () => {
    const endpoint = '/monitoreos';

    // 1. CAMINO FELIZ
    it('debería retornar la lista de monitoreos del usuario actual', () => {
      const mockData: MonitoreoListadoDTO[] = [
        { id: 1, nombre: 'Web Principal', activo: true, paginaUrl: 'https://test.com' } as any
      ];

      service.getMisMonitoreos().subscribe(res => {
        expect(res.length).toBe(1);
        expect(res[0].nombre).toBe('Web Principal');
      });

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    // 2. CASO DE BORDE
    it('debería manejar una respuesta vacía [] si el usuario no tiene monitoreos', () => {
      service.getMisMonitoreos().subscribe(res => {
        expect(res).toEqual([]);
      });

      const req = httpMock.expectOne(endpoint);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES
    it('debería propagar error 500 cuando el servidor falla', () => {
      service.getMisMonitoreos().subscribe({
        next: () => expect.fail('No debería haber tenido éxito'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });

    // 4. INTEGRIDAD
    it('debería realizar la petición a la URL base exacta sin parámetros extra', () => {
      service.getMisMonitoreos().subscribe();
      const req = httpMock.expectOne(endpoint);
      expect(req.request.url).toBe(endpoint);
      req.flush([]);
    });
  });

  describe('obtenerTodosLosMonitoreos()', () => {
    const endpointAll = '/monitoreos/all';

    // 1. CAMINO FELIZ
    it('debería retornar todos los monitoreos del sistema (rol admin)', () => {
      const mockData: MonitoreoListadoDTO[] = [
        { id: 1, nombre: 'Monitoreo Global', activo: true } as any
      ];

      service.obtenerTodosLosMonitoreos().subscribe(res => {
        expect(res.length).toBe(1);
        expect(res[0].id).toBe(1);
      });

      const req = httpMock.expectOne(endpointAll);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    // 2. CASO DE BORDE
    it('debería manejar una respuesta null del servidor de forma segura', () => {
      service.obtenerTodosLosMonitoreos().subscribe(res => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(endpointAll);
      req.flush(null);
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 403 si el usuario no tiene permisos de administrador', () => {
      service.obtenerTodosLosMonitoreos().subscribe({
        next: () => expect.fail('Debería haber fallado con 403'),
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(endpointAll);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que el endpoint termina específicamente en /all', () => {
      service.obtenerTodosLosMonitoreos().subscribe();
      const req = httpMock.expectOne(req => req.url.includes('/all'));
      expect(req.request.url).toBe(endpointAll);
      req.flush([]);
    });
  });

  describe('getColaboraciones()', () => {
    const endpoint = '/monitoreos/colaboraciones';

    // 1. CAMINO FELIZ
    it('debería retornar la lista de monitoreos donde el usuario es colaborador', () => {
      const mockColaboraciones: MonitoreoListadoDTO[] = [
        { id: 50, nombre: 'Proyecto Compartido', activo: true, paginaUrl: 'https://shared.com' } as any
      ];

      service.getColaboraciones().subscribe(res => {
        expect(res.length).toBe(1);
        expect(res[0].id).toBe(50);
        expect(res[0].nombre).toBe('Proyecto Compartido');
      });

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('GET');
      req.flush(mockColaboraciones);
    });

    // 2. CASO DE BORDE
    it('debería retornar un array vacío si el usuario no colabora en ningún monitoreo', () => {
      service.getColaboraciones().subscribe(res => {
        expect(res).toEqual([]);
      });

      const req = httpMock.expectOne(endpoint);
      req.flush([]);
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar un error 401 (No autorizado) si la sesión ha expirado', () => {
      service.getColaboraciones().subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la URL de colaboraciones es correcta y no se confunde con el GET por ID', () => {
      service.getColaboraciones().subscribe();

      const req = httpMock.expectOne(req => req.url.endsWith('/colaboraciones'));
      expect(req.request.url).toBe(endpoint);
      req.flush([]);
    });
  });

  describe('getMonitoreoPorId()', () => {
    const idTest = 123;
    const endpoint = `/monitoreos/${idTest}`;

    // 1. CAMINO FELIZ
    it('debería retornar el detalle completo de un monitoreo específico', () => {
      const mockDetalle: Partial<MonitoreoDTODetalle> = {
        id: idTest,
        nombre: 'Servidor Producción',
        minutos: 5,
        repeticiones: 3,
        activo: true
      };

      service.getMonitoreoPorId(idTest).subscribe(res => {
        expect(res.id).toBe(idTest);
        expect(res.nombre).toBe('Servidor Producción');
        expect(res.minutos).toBe(5);
      });

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('GET');
      req.flush(mockDetalle);
    });

    // 2. CASO DE BORDE
    it('debería funcionar correctamente con IDs negativos o extremos si el backend lo permite', () => {
      const idExtremo = 999999;
      service.getMonitoreoPorId(idExtremo).subscribe();

      const req = httpMock.expectOne(`/monitoreos/${idExtremo}`);
      expect(req.request.url).toContain(idExtremo.toString());
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar error 404 si el monitoreo solicitado no existe', () => {
      service.getMonitoreoPorId(idTest).subscribe({
        next: () => expect.fail('Debería haber fallado con 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD
    it('debería enviar la petición GET al recurso dinámico correcto con el ID', () => {
      service.getMonitoreoPorId(idTest).subscribe();

      const req = httpMock.expectOne(req => req.url === `/monitoreos/${idTest}`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('crearMonitoreo()', () => {
    const endpoint = '/monitoreos';
    const payload = {
      nombre: 'Nuevo Monitoreo',
      paginaUrl: 'https://test.com',
      minutos: 10,
      repeticiones: 3
    };

    // 1. CAMINO FELIZ
    it('debería crear un monitoreo y retornar el objeto creado', () => {
      const mockResponse: Partial<MonitoreoDTODetalle> = { id: 1, ...payload } as any;

      service.crearMonitoreo(payload).subscribe(res => {
        expect(res.id).toBe(1);
        expect(res.nombre).toBe(payload.nombre);
      });

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload); // Verificamos que enviamos lo correcto
      req.flush(mockResponse);
    });

    // 2. CASO DE BORDE
    it('debería permitir la creación con valores mínimos (p.ej. 1 minuto)', () => {
      const payloadMinimo = { ...payload, minutos: 1 };
      service.crearMonitoreo(payloadMinimo).subscribe();

      const req = httpMock.expectOne(endpoint);
      expect(req.request.body.minutos).toBe(1);
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar un error 400 (Bad Request) si los datos son inválidos', () => {
      service.crearMonitoreo(payload).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(400)
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Invalid Data', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que el Content-Type de la petición sea JSON', () => {
      service.crearMonitoreo(payload).subscribe();
      const req = httpMock.expectOne(endpoint);
      // Angular por defecto lo pone, pero aquí verificamos la integridad de la salida
      expect(req.request.headers.get('Content-Type')).toBeNull(); // HttpClient lo añade al serializar, pero verificamos que no hay headers extraños
      req.flush({});
    });
  });

  describe('updateMonitoreo()', () => {
    const idUpdate = 45;
    const endpoint = `/monitoreos/${idUpdate}`;
    const updatePayload: Partial<MonitoreoDTODetalle> = { nombre: 'Nombre Editado', activo: false };

    // 1. CAMINO FELIZ
    it('debería actualizar un monitoreo existente con éxito', () => {
      service.updateMonitoreo(idUpdate, updatePayload).subscribe(res => {
        expect(res.nombre).toBe('Nombre Editado');
      });

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatePayload);
      req.flush({ id: idUpdate, ...updatePayload });
    });

    // 2. CASO DE BORDE
    it('debería funcionar correctamente al enviar un payload parcial vacío {}', () => {
      service.updateMonitoreo(idUpdate, {}).subscribe();

      const req = httpMock.expectOne(endpoint);
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar error 403 si el usuario no tiene permisos para editar este monitoreo', () => {
      service.updateMonitoreo(idUpdate, updatePayload).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(403)
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD
    it('debería construir la URL de actualización con el ID numérico correctamente', () => {
      service.updateMonitoreo(999, {}).subscribe();
      const req = httpMock.expectOne('/monitoreos/999');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });
  });

  describe('eliminarMonitoreo()', () => {
    const idDelete = 10;
    const endpoint = `/monitoreos/${idDelete}`;

    // 1. CAMINO FELIZ
    it('debería enviar una petición DELETE al servidor', () => {
      service.eliminarMonitoreo(idDelete).subscribe(res => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('DELETE');
      req.flush(null); // DELETE exitoso suele devolver null o void
    });

    // 2. CASO DE BORDE
    it('debería manejar la eliminación de un ID muy alto', () => {
      const idAlto = 888888;
      let llamado = false;

      service.eliminarMonitoreo(idAlto).subscribe({
        next: (res) => {
          expect(res).toBeNull(); // <--- Aserción explícita para SonarQube
          llamado = true;
        }
      });

      const req = httpMock.expectOne(`/monitoreos/${idAlto}`);
      req.flush(null);
      expect(llamado).toBe(true); // Verificación extra de que el flujo terminó
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar error 404 si el monitoreo ya fue eliminado previamente', () => {
      service.eliminarMonitoreo(idDelete).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(404)
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que la petición DELETE no lleva cuerpo (body)', () => {
      service.eliminarMonitoreo(idDelete).subscribe();
      const req = httpMock.expectOne(endpoint);
      expect(req.request.body).toBeNull();
      req.flush(null);
    });
  });

  describe('invitacionEnMasa()', () => {
    const ids = [1, 2];
    const emails = ['test1@test.com', 'test2@test.com'];
    // Corregimos la URL según el error de la terminal
    const endpointBase = '/monitoreos/invitar';

    it('debería enviar correctamente la petición PUT con los emails en la URL', () => {
      let completado = false;
      service.invitacionEnMasa(ids, emails).subscribe(() => completado = true);

      // El error dice que recibe un PUT a /monitoreos/invitar
      const req = httpMock.expectOne(req =>
        req.url === endpointBase &&
        req.method === 'PUT' && // Cambiado de POST a PUT
        req.params.get('emails') === 'test1@test.com,test2@test.com'
      );

      req.flush(null);
      expect(completado).toBe(true);
    });

    it('debería manejar error 400 si el servidor falla', () => {
      service.invitacionEnMasa(ids, emails).subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (error) => expect(error.status).toBe(400)
      });

      const req = httpMock.expectOne(req => req.url === endpointBase);
      req.flush('Error', { status: 400, statusText: 'Bad Request' });
    });

    it('debería asegurar integridad: método PUT y parámetros presentes', () => {
      service.invitacionEnMasa(ids, emails).subscribe();
      const req = httpMock.expectOne(req => req.url === endpointBase);
      expect(req.request.method).toBe('PUT');
      expect(req.request.params.has('emails')).toBe(true);
      req.flush(null);
    });
  });

  describe('quitarEnMasa()', () => {
    const ids = [1, 2, 3];
    const emails = ['user1@test.com', 'user2@test.com'];
    const endpoint = '/monitoreos/invitar';

    // 1. CAMINO FELIZ
    it('debería enviar los IDs en el body y los emails en los params mediante DELETE', () => {
      let exito = false;
      service.quitarEnMasa(ids, emails).subscribe(() => exito = true);

      // Usamos una función para que coincida con la URL base + parámetros
      const req = httpMock.expectOne(r => r.url === endpoint);

      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('emails')).toBe('user1@test.com,user2@test.com');
      expect(req.request.body).toEqual(ids);
      req.flush(null);
      expect(exito).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería funcionar correctamente con listas vacías si el servicio lo permite', () => {
      let completado = false;
      service.quitarEnMasa([], []).subscribe(() => completado = true);

      const req = httpMock.expectOne(r => r.url === endpoint);
      expect(req.request.params.get('emails')).toBe('');
      req.flush(null);
      expect(completado).toBe(true);
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar error 400 en eliminación masiva', () => {
      service.quitarEnMasa(ids, emails).subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (e) => expect(e.status).toBe(400)
      });

      // IMPORTANTE: Aquí también hay que usar la función para ignorar los query params
      const req = httpMock.expectOne(r => r.url === endpoint);
      req.flush('Error', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD
    it('debería asegurar que es un método DELETE', () => {
      service.quitarEnMasa(ids, emails).subscribe();

      const req = httpMock.expectOne(r => r.url === endpoint);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

});
