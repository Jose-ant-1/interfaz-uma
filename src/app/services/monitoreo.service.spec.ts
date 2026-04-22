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
    // 1. LIMPIEZA: Forzamos el reset antes de configurar nada
    TestBed.resetTestingModule();

    // 2. CONFIGURACIÓN
    TestBed.configureTestingModule({
      providers: [
        MonitoreoService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    // 3. INSTANCIACIÓN: Solo después de configurar llamamos a inject
    service = TestBed.inject(MonitoreoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Pilar Resiliencia: Cerramos todas las peticiones abiertas para evitar timeouts
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

    // 4. INTEGRIDAD (URL y Cabeceras)
    it('debería realizar la petición con las cabeceras técnicas correctas', () => {
      service.getMisMonitoreos().subscribe();

      const req = httpMock.expectOne(endpoint);
      expect(req.request.url).toBe(endpoint);
      // Verificamos que no se envíen parámetros de búsqueda accidentales
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    // 5. VALIDACIÓN DE NEGOCIO (Mapeo y Consistencia)
    it('debería ignorar campos extra del JSON que no pertenecen al DTO (Mapeo seguro)', () => {
      const mockConBasura = [
        {
          id: 1,
          nombre: 'Test',
          campoInexistente: 'borrame', // El backend a veces envía datos de más
          activo: true
        }
      ];

      service.getMisMonitoreos().subscribe(res => {
        expect(res[0]).not.toHaveProperty('campoInexistente');
        expect(res[0].id).toBe(1);
      });

      const req = httpMock.expectOne(endpoint);
      req.flush(mockConBasura);
    });

    // 6. ROBUSTEZ (Estado de carga/Latencia)
    it('debería mantener el flujo abierto hasta que el servidor responda (Latencia)', () => {
      let dataRecibida = false;

      service.getMisMonitoreos().subscribe(() => {
        dataRecibida = true;
      });

      const req = httpMock.expectOne(endpoint);
      expect(dataRecibida).toBe(false); // Aún no ha respondido

      req.flush([]); // El servidor responde tras un retraso
      expect(dataRecibida).toBe(true);
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

    // 4. INTEGRIDAD TÉCNICA
    it('debería asegurar que el endpoint es exacto y no envía parámetros extra', () => {
      service.obtenerTodosLosMonitoreos().subscribe();
      const req = httpMock.expectOne(endpointAll);
      expect(req.request.url).toBe(endpointAll);
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    // 5. VALIDACIÓN DE NEGOCIO (Mapeo Seguro)
    it('debería filtrar propiedades desconocidas del JSON recibido (Mapeo robusto)', () => {
      const mockDataExtra = [
        { id: 1, nombre: 'Global', activo: true, metadataInterna: 'secreto' }
      ];

      service.obtenerTodosLosMonitoreos().subscribe(res => {
        // Este expect fallará si no has añadido el .pipe(map(...)) en el .ts
        expect(res[0]).not.toHaveProperty('metadataInterna');
        expect(res[0].nombre).toBe('Global');
      });

      const req = httpMock.expectOne(endpointAll);
      req.flush(mockDataExtra);
    });

    // 6. ROBUSTEZ (Estado de Latencia)
    it('debería mantener la suscripción activa durante latencia de red', () => {
      let respondido = false;
      service.obtenerTodosLosMonitoreos().subscribe(() => respondido = true);

      const req = httpMock.expectOne(endpointAll);
      expect(respondido).toBe(false);

      req.flush([]);
      expect(respondido).toBe(true);
    });
  });

  describe('getColaboraciones()', () => {
    const endpointColab = '/monitoreos/colaboraciones';

    // 1. CAMINO FELIZ
    it('debería retornar los monitoreos donde el usuario es invitado', () => {
      const mockData: MonitoreoListadoDTO[] = [
        { id: 10, nombre: 'Proyecto Compartido', activo: true } as any
      ];

      service.getColaboraciones().subscribe(res => {
        expect(res.length).toBe(1);
        expect(res[0].nombre).toBe('Proyecto Compartido');
      });

      const req = httpMock.expectOne(endpointColab);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });

    // 2. CASO DE BORDE
    it('debería manejar correctamente una respuesta null sin romper la aplicación', () => {
      service.getColaboraciones().subscribe(res => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(endpointColab);
      req.flush(null);
    });

    // 3. MANEJO DE ERRORES
    it('debería propagar error 401 si la sesión ha caducado', () => {
      service.getColaboraciones().subscribe({
        next: () => expect.fail('Debería fallar'),
        error: (e) => expect(e.status).toBe(401)
      });

      const req = httpMock.expectOne(endpointColab);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    // 4. INTEGRIDAD TÉCNICA
    it('debería llamar a la URL exacta de colaboraciones sin parámetros accidentales', () => {
      service.getColaboraciones().subscribe();
      const req = httpMock.expectOne(endpointColab);
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    // 5. VALIDACIÓN DE NEGOCIO (Mapeo Seguro)
    it('debería limpiar propiedades extra de la respuesta de colaboraciones', () => {
      const mockDataExtra = [{ id: 1, nombre: 'C', extra: 'data' }];

      service.getColaboraciones().subscribe(res => {
        // Ahora este test PASARÁ porque el .pipe(map) eliminó 'extra'
        expect(res[0]).not.toHaveProperty('extra');
        expect(res[0].id).toBe(1);
      });

      const req = httpMock.expectOne(endpointColab);
      req.flush(mockDataExtra);
    });

    // 6. ROBUSTEZ (Latencia)
    it('debería esperar la respuesta del servidor sin cancelar la petición por demora', () => {
      let completado = false;
      service.getColaboraciones().subscribe(() => completado = true);

      const req = httpMock.expectOne(endpointColab);
      expect(completado).toBe(false);
      req.flush([]);
      expect(completado).toBe(true);
    });
  });

  describe('getMonitoreoPorId()', () => {
    const id = 123;
    const endpointId = `/monitoreos/${id}`;

    // 1. CAMINO FELIZ
    it('debería retornar el detalle de un monitoreo específico', () => {
      const mockDetalle: MonitoreoDTODetalle = {
        id: id,
        nombre: 'Detalle Test',
        minutos: 5,
        activo: true
      } as any;

      service.getMonitoreoPorId(id).subscribe(res => {
        expect(res.id).toBe(id);
        expect(res.nombre).toBe('Detalle Test');
      });

      const req = httpMock.expectOne(endpointId);
      expect(req.request.method).toBe('GET');
      req.flush(mockDetalle);
    });

// 2. CASO DE BORDE
    it('debería manejar el caso de que el ID sea 0 o negativo', () => {
      let resultado: any;

      service.getMonitoreoPorId(0).subscribe(res => {
        resultado = res;
      });

      const req = httpMock.expectOne('/monitoreos/0');
      req.flush(null);

      // AÑADIMOS ESTO: La aserción que contenta a SonarQube
      expect(resultado).toBeNull();
    });

    // 3. MANEJO DE ERRORES
    it('debería retornar 404 si el monitoreo no existe', () => {
      service.getMonitoreoPorId(999).subscribe({
        next: () => expect.fail('No debería existir'),
        error: (e) => expect(e.status).toBe(404)
      });

      const req = httpMock.expectOne('/monitoreos/999');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD TÉCNICA (URL DINÁMICA)
    it('debería construir la URL correctamente con el ID proporcionado', () => {
      const testId = 55;
      service.getMonitoreoPorId(testId).subscribe();

      const req = httpMock.expectOne(`/monitoreos/${testId}`);
      expect(req.request.url).toBe(`/monitoreos/${testId}`);
      req.flush({});
    });

    // 5. VALIDACIÓN DE NEGOCIO (Mapeo Seguro)
    it('debería limpiar propiedades extrañas del objeto de detalle', () => {
      const mockConBasura = {
        id: id,
        nombre: 'Limpio',
        datoMalaFe: 'eliminar_esto'
      };

      service.getMonitoreoPorId(id).subscribe(res => {
        expect(res).not.toHaveProperty('datoMalaFe');
        expect(res.nombre).toBe('Limpio');
      });

      const req = httpMock.expectOne(endpointId);
      req.flush(mockConBasura);
    });

    // 6. ROBUSTEZ (Latencia)
    it('debería mantener la conexión abierta mientras el servidor busca el ID', () => {
      let cargado = false;
      service.getMonitoreoPorId(id).subscribe(() => cargado = true);

      const req = httpMock.expectOne(endpointId);
      expect(cargado).toBe(false);
      req.flush({});
      expect(cargado).toBe(true);
    });
  });

  describe('crearMonitoreo()', () => {
    const mockPayload = { nombre: 'Nuevo', paginaUrl: 'http://test.com', minutos: 10, repeticiones: 3 };

    // 1. CAMINO FELIZ (Funcionalidad)
    it('debería enviar un POST con los datos del nuevo monitoreo', () => {
      service.crearMonitoreo(mockPayload).subscribe(res => {
        expect(res.nombre).toBe('Nuevo');
      });

      const req = httpMock.expectOne('/monitoreos');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockPayload);
      req.flush({ ...mockPayload, id: 1 });
    });

    // 2. CASO DE BORDE (Robustez técnica)
    it('debería manejar errores de validación del servidor (400)', () => {
      service.crearMonitoreo(mockPayload).subscribe({
        error: (e) => expect(e.status).toBe(400)
      });

      const req = httpMock.expectOne('/monitoreos');
      req.flush('Invalid Data', { status: 400, statusText: 'Bad Request' });
    });

    // 3. SANITIZACIÓN TÉCNICA (Seguridad de datos)
    it('debería limpiar espacios en blanco del nombre y URL antes de enviar al servidor', () => {
      const sucio = { ...mockPayload, nombre: '  Sucio  ', paginaUrl: '  http://link.com  ' };
      service.crearMonitoreo(sucio).subscribe();

      const req = httpMock.expectOne('/monitoreos');
      expect(req.request.body.nombre).toBe('Sucio');
      expect(req.request.body.paginaUrl).toBe('http://link.com');
      req.flush({});
    });

    // 4. INTEGRIDAD (Consistencia técnica)
    it('debería asegurar que no se envían parámetros de consulta accidentales en el POST', () => {
      service.crearMonitoreo(mockPayload).subscribe();
      const req = httpMock.expectOne('/monitoreos');
      expect(req.request.params.keys().length).toBe(0);
      req.flush({});
    });

    // 5. VALIDACIÓN DE NEGOCIO (Mapeo de integridad)
    it('debería asegurar que el objeto retornado tiene lista de invitados aunque venga null', () => {
      service.crearMonitoreo(mockPayload).subscribe(res => {
        expect(res.invitados).toBeDefined();
        expect(Array.isArray(res.invitados)).toBe(true);
      });

      const req = httpMock.expectOne('/monitoreos');
      req.flush({ id: 1, invitados: null });
    });

    // 6. ROBUSTEZ (Estado de Latencia/Carga) - EL QUE FALTABA
    it('debería mantener el flujo asíncrono activo mientras el servidor procesa el alta', () => {
      let finalizado = false;
      service.crearMonitoreo(mockPayload).subscribe(() => finalizado = true);

      const req = httpMock.expectOne('/monitoreos');
      expect(finalizado).toBe(false); // Verificamos que espera

      req.flush({ id: 1 });
      expect(finalizado).toBe(true); // Verificamos que completa tras la respuesta
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
      let resultado: any;
      service.updateMonitoreo(idUpdate, {}).subscribe(res => resultado = res);

      const req = httpMock.expectOne(endpoint);
      expect(req.request.body).toEqual({});
      req.flush({ id: idUpdate });
      expect(resultado).toBeDefined(); // Aserción para SonarQube
    });

    // 3. MANEJO DE ERRORES
    it('debería manejar error 403 si el usuario no tiene permisos para editar', () => {
      service.updateMonitoreo(idUpdate, updatePayload).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(403)
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    // 4. INTEGRIDAD TÉCNICA
    it('debería construir la URL de actualización con el ID numérico correctamente', () => {
      service.updateMonitoreo(999, {}).subscribe();
      const req = httpMock.expectOne('/monitoreos/999');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    // 5. SANITIZACIÓN TÉCNICA (NUEVO)
    it('debería aplicar trim al nombre si se incluye en el payload parcial', () => {
      const payloadSucio = { nombre: '  Editado con espacios  ' };
      service.updateMonitoreo(idUpdate, payloadSucio).subscribe();

      const req = httpMock.expectOne(endpoint);
      expect(req.request.body.nombre).toBe('Editado con espacios');
      req.flush({});
    });

    // 6. ROBUSTEZ (Latencia) (NUEVO)
    it('debería mantener la suscripción activa durante la espera del servidor', () => {
      let finalizado = false;
      service.updateMonitoreo(idUpdate, updatePayload).subscribe(() => finalizado = true);

      const req = httpMock.expectOne(endpoint);
      expect(finalizado).toBe(false);

      req.flush({ id: idUpdate });
      expect(finalizado).toBe(true);
    });
  });

  describe('eliminarMonitoreo()', () => {
    const idDelete = 10;
    const endpoint = `/monitoreos/${idDelete}`;

    // 1. CAMINO FELIZ (Funcionalidad)
    it('debería enviar una petición DELETE al servidor', () => {
      let exito = false;
      service.eliminarMonitoreo(idDelete).subscribe(() => exito = true);

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(exito).toBe(true);
    });

    // 2. CASO DE BORDE (Robustez técnica)
    it('debería manejar la eliminación de un ID muy alto o inusual', () => {
      const idAlto = 888888;
      let llamado = false;

      service.eliminarMonitoreo(idAlto).subscribe(() => llamado = true);

      const req = httpMock.expectOne(`/monitoreos/${idAlto}`);
      req.flush(null);
      expect(llamado).toBe(true);
    });

    // 3. MANEJO DE ERRORES (Seguridad)
    it('debería manejar error 404 si el monitoreo ya no existe', () => {
      service.eliminarMonitoreo(idDelete).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (error) => expect(error.status).toBe(404)
      });

      const req = httpMock.expectOne(endpoint);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    // 4. INTEGRIDAD TÉCNICA (Estructura)
    it('debería asegurar que la petición DELETE no lleva cuerpo ni parámetros extra', () => {
      service.eliminarMonitoreo(idDelete).subscribe();
      const req = httpMock.expectOne(endpoint);

      expect(req.request.body).toBeNull();
      expect(req.request.params.keys().length).toBe(0); // Integridad: URL limpia
      req.flush(null);
    });

    // 5. VALIDACIÓN DE NEGOCIO (Consistencia)
    it('debería transformar cualquier respuesta del servidor en un void consistente', () => {
      let valorRecibido: any = 'inicial';
      // Incluso si el servidor devuelve un objeto por error, el map lo limpia
      service.eliminarMonitoreo(idDelete).subscribe(res => valorRecibido = res);

      const req = httpMock.expectOne(endpoint);
      req.flush({ message: 'Deleted' });

      expect(valorRecibido).toBeUndefined(); // El map garantiza que sea void
    });

    // 6. ROBUSTEZ (Latencia/Estado de Carga)
    it('debería mantener la suscripción activa hasta confirmar el borrado', () => {
      let borradoConfirmado = false;
      service.eliminarMonitoreo(idDelete).subscribe(() => borradoConfirmado = true);

      const req = httpMock.expectOne(endpoint);
      expect(borradoConfirmado).toBe(false); // Esperando al servidor

      req.flush(null);
      expect(borradoConfirmado).toBe(true); // Confirmado
    });
  });

  describe('invitacionEnMasa()', () => {
    const ids = [1, 2];
    const emails = ['test1@test.com', 'test2@test.com'];
    const endpointBase = '/monitoreos/invitar';

    // 1. CAMINO FELIZ (Funcionalidad)
    it('debería enviar correctamente la petición con IDs en el body y emails en params', () => {
      let completado = false;
      service.invitacionEnMasa(ids, emails).subscribe(() => completado = true);

      const req = httpMock.expectOne(req => req.url === endpointBase);

      expect(req.request.method).toBe('PUT');
      expect(req.request.params.get('emails')).toBe('test1@test.com,test2@test.com');
      expect(req.request.body).toEqual(ids); // Integridad del Body

      req.flush(null);
      expect(completado).toBe(true);
    });

    // 2. CASO DE BORDE (Robustez técnica)
    it('debería manejar el envío de listas vacías sin romperse', () => {
      service.invitacionEnMasa([], []).subscribe();
      const req = httpMock.expectOne(req => req.url === endpointBase);
      expect(req.request.params.get('emails')).toBe('');
      expect(req.request.body).toEqual([]);
      req.flush(null);
    });

    // 3. MANEJO DE ERRORES (Seguridad)
    it('debería propagar error 400 si el servidor rechaza la invitación', () => {
      service.invitacionEnMasa(ids, emails).subscribe({
        error: (error) => expect(error.status).toBe(400)
      });

      const req = httpMock.expectOne(req => req.url === endpointBase);
      req.flush('Error', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD TÉCNICA (Estructura de la petición)
    it('debería asegurar que la URL no contiene basura y el método es PUT', () => {
      service.invitacionEnMasa(ids, emails).subscribe();
      const req = httpMock.expectOne(req => req.url === endpointBase);
      expect(req.request.method).toBe('PUT');
      // Solo debe existir el parámetro 'emails'
      expect(req.request.params.keys().length).toBe(1);
      req.flush(null);
    });

    // 5. SANITIZACIÓN TÉCNICA (NUEVO)
    it('debería limpiar espacios en blanco de los emails antes de concatenarlos', () => {
      const emailsSucios = [' user1@test.com ', ' user2@test.com '];
      service.invitacionEnMasa(ids, emailsSucios).subscribe();

      const req = httpMock.expectOne(req => req.url === endpointBase);
      // Verificamos que el servicio aplicó el trim() antes del join()
      expect(req.request.params.get('emails')).toBe('user1@test.com,user2@test.com');
      req.flush(null);
    });

    // 6. ROBUSTEZ (Latencia)
    it('debería mantener la suscripción activa durante el proceso masivo', () => {
      let finalizado = false;
      service.invitacionEnMasa(ids, emails).subscribe(() => finalizado = true);

      const req = httpMock.expectOne(req => req.url === endpointBase);
      expect(finalizado).toBe(false);
      req.flush(null);
      expect(finalizado).toBe(true);
    });
  });

  describe('quitarEnMasa()', () => {
    const ids = [1, 2, 3];
    const emails = ['user1@test.com', 'user2@test.com'];
    const endpoint = '/monitoreos/invitar';

    // 1. CAMINO FELIZ (Funcionalidad)
    it('debería enviar los IDs en el body y los emails en los params mediante DELETE', () => {
      let exito = false;
      service.quitarEnMasa(ids, emails).subscribe(() => exito = true);

      const req = httpMock.expectOne(r => r.url === endpoint);

      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('emails')).toBe('user1@test.com,user2@test.com');
      expect(req.request.body).toEqual(ids); // Integridad: El body debe viajar correctamente
      req.flush(null);
      expect(exito).toBe(true);
    });

    // 2. CASO DE BORDE (Robustez técnica)
    it('debería funcionar correctamente con listas vacías sin lanzar excepciones', () => {
      let completado = false;
      service.quitarEnMasa([], []).subscribe(() => completado = true);

      const req = httpMock.expectOne(r => r.url === endpoint);
      expect(req.request.params.get('emails')).toBe('');
      expect(req.request.body).toEqual([]);
      req.flush(null);
      expect(completado).toBe(true);
    });

    // 3. MANEJO DE ERRORES (Seguridad)
    it('debería manejar error 400 si la desvinculación masiva falla en el servidor', () => {
      service.quitarEnMasa(ids, emails).subscribe({
        next: () => expect.fail('Debería haber fallado'),
        error: (e) => expect(e.status).toBe(400)
      });

      const req = httpMock.expectOne(r => r.url === endpoint);
      req.flush('Error', { status: 400, statusText: 'Bad Request' });
    });

    // 4. INTEGRIDAD TÉCNICA (Estructura)
    it('debería asegurar que es un método DELETE y contiene las cabeceras necesarias', () => {
      service.quitarEnMasa(ids, emails).subscribe();
      const req = httpMock.expectOne(r => r.url === endpoint);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.keys().length).toBe(1); // Solo emails
      req.flush(null);
    });

    // 5. SANITIZACIÓN TÉCNICA (NUEVO)
    it('debería limpiar espacios de los emails antes de procesar la baja masiva', () => {
      const sucios = ['  email1@test.com  '];
      service.quitarEnMasa(ids, sucios).subscribe();

      const req = httpMock.expectOne(r => r.url === endpoint);
      expect(req.request.params.get('emails')).toBe('email1@test.com');
      req.flush(null);
    });

    // 6. ROBUSTEZ (Latencia/Carga) (NUEVO)
    it('debería mantener la suscripción viva mientras se procesa la eliminación', () => {
      let finalizado = false;
      service.quitarEnMasa(ids, emails).subscribe(() => finalizado = true);

      const req = httpMock.expectOne(r => r.url === endpoint);
      expect(finalizado).toBe(false); // Sigue esperando

      req.flush(null);
      expect(finalizado).toBe(true); // Terminado
    });
  });

});
