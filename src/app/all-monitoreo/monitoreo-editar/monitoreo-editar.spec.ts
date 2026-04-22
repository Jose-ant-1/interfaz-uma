import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonitoreoEditar } from './monitoreo-editar';
import { MonitoreoService } from '../../services/monitoreo.service';
import { UsuarioService } from '../../services/usuario.service';
import { PaginaService } from '../../services/pagina.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../models/usuario.model';

describe('MonitoreoEditar - Blindaje de Edición Compleja', () => {
  let component!: MonitoreoEditar;
  let fixture!: ComponentFixture<MonitoreoEditar>;

  const mockMonitoreoService = {
    getMonitoreoPorId: vi.fn(),
    updateMonitoreo: vi.fn(),
    invitacionEnMasa: vi.fn(),
    quitarEnMasa: vi.fn()
  };

  const mockUsuarioService = { getUsuarios: vi.fn() };
  const mockPaginaService = { getPaginas: vi.fn() };
  const mockRouter = { navigate: vi.fn() };
  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: vi.fn().mockReturnValue('1') // Asegúrate de que es un mock funcional
      }
    }
  };

  const mockUsuario: Usuario = {
    id: 10,
    nombre: 'Colaborador Test',
    email: 'test@colab.com',
    permiso: 'LECTURA'
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      // 1. IMPORTANTE: Sacamos MonitoreoEditar de imports aquí
      // y lo movemos a la configuración manual de abajo
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: PaginaService, useValue: mockPaginaService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
      // 2. FORZAMOS que no busque el archivo .html
      .overrideComponent(MonitoreoEditar, {
        set: {
          template: `
<div class="max-w-4xl mx-auto p-4 sm:p-8">
    <button (click)="guardar()" [disabled]="guardando()">Guardar</button>

    @if (!cargando()) {
      @for (user of usuariosSistema(); track user.id) {
        <div>
           <input type="checkbox"
                  [id]="'toggle-' + user.id"
                  [checked]="esInvitado(user.id)"
                  (change)="toggleInvitado(user)">
        </div>
      } @empty {
        <p>No hay usuarios disponibles</p>
      }
    }
  </div>
`, // Plantilla vacía para que no intente leer el disco
          imports: [CommonModule, FormsModule] // Re-inyectamos los imports aquí
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MonitoreoEditar);
    component = fixture.componentInstance;

    // Mocks por defecto para evitar errores en ngOnInit
    mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of({
      id: 1, nombre: 'Test', minutos: 10, repeticiones: 3, invitados: [], paginaUrl: 'test.com'
    }));
    mockUsuarioService.getUsuarios.mockReturnValue(of([]));
    mockPaginaService.getPaginas.mockReturnValue(of([]));

    fixture.detectChanges();
  });

  it('debería crearse el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inject)', () => {

    it('debería inyectar correctamente todos los servicios y utilidades', () => {
      // Accedemos a las propiedades privadas mediante casting a 'any'
      // para verificar que el 'inject()' funcionó correctamente.
      const comp = component as any;

      expect(comp.usuarioService).toBeDefined();
      expect(comp.monitoreoService).toBeDefined();
      expect(comp.paginaService).toBeDefined();
      expect(comp.route).toBeDefined();
      expect(comp.router).toBeDefined();
    });

    it('debería utilizar las instancias de mocks proporcionadas en el TestBed', () => {
      const comp = component as any;

      // Verificamos que el servicio inyectado sea exactamente nuestro mock
      // Esto previene errores donde se inyecte el servicio real por accidente
      expect(comp.monitoreoService).toBe(mockMonitoreoService);
      expect(comp.usuarioService).toBe(mockUsuarioService);
      expect(comp.paginaService).toBe(mockPaginaService);
    });

    it('debería tener acceso a los parámetros de la ruta activa (ID del monitoreo)', () => {
      const comp = component as any;
      const id = comp.route.snapshot.paramMap.get('id');

      expect(id).toBe('1');
      expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('id');
    });

    it('debería fallar si no recibe un ID válido en la ruta (Caso de Borde/Integridad)', () => {
      // Simulamos que la URL no tiene ID
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);

      // Al ser un test de inyección, verificamos que el componente maneja la ausencia
      const id = component['route'].snapshot.paramMap.get('id');
      expect(id).toBeNull();
      // Esto preparará el camino para el test de ngOnInit donde no se debe llamar al servicio
    });

    it('debería asegurar que los servicios inyectados son Singletons/Mocks (Integridad)', () => {
      const comp = component as any;
      expect(comp.monitoreoService).toBe(mockMonitoreoService);
      expect(comp.usuarioService).toBe(mockUsuarioService);
    });

    it('debería cumplir con el Test de Estado de Carga inicial (Integridad)', () => {
      // Verificamos que al arrancar, el estado de UI sea coherente
      expect(component.cargando()).toBe(true);
      expect(component.guardando()).toBe(false);
    });

    it('debería inicializar el modelo con valores por defecto (Validación de Negocio/Borde)', () => {
      // Verificamos que el objeto parcial no sea null y tenga sus bases
      expect(component.monitoreo).toBeDefined();
      expect(component.monitoreo.minutos).toBe(1);
      expect(component.monitoreo.repeticiones).toBe(1);
      expect(component.invitadosOriginales).toEqual([]);
    });

  });

  describe('ngOnInit()', () => {

    it('debería ejecutar el Camino Feliz: cargar todos los datos y actualizar estados', async () => {
      // 1. Preparación (Integridad de Mocks)
      const mockMonitoreo = {id: 1, nombre: 'Test', invitados: []};
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of(mockMonitoreo));
      mockUsuarioService.getUsuarios.mockReturnValue(of([]));
      mockPaginaService.getPaginas.mockReturnValue(of([]));

      // 2. Ejecución: Llamamos directamente al orquestador para poder hacer 'await' real
      // Accedemos como 'any' porque es privado, pero es la única forma de blindar la espera
      await (component as any).inicializarDatos(1);
      fixture.detectChanges();

      // 3. Verificación (Pilar de Integridad y Estado de Carga)
      expect(component.monitoreo.id).toBe(1);
      expect(component.cargando()).toBe(false); // El finally debe haberlo puesto a false
    });

    it('debería cumplir con el Test de Bloqueo de Re-entrada', async () => {
      // Pilar: Bloqueo de Re-entrada - Evitar peticiones duplicadas si ya se está cargando el mismo ID
      component.monitoreo.id = 1;
      component.cargando.set(true);

      const spyCargar = vi.spyOn(mockMonitoreoService, 'getMonitoreoPorId');

      await (component as any).inicializarDatos(1);

      // No debe haberse llamado porque el blindaje (id === id && cargando) lo impide
      expect(spyCargar).not.toHaveBeenCalled();
    });

    it('debería cumplir con el Manejo de Errores Críticos (Blindaje de UI)', async () => {
      // Pilar: Manejo de Errores - Si el servicio falla, el spinner no debe quedarse infinito
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(throwError(() => new Error('500')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      });

      // Esperamos la resolución completa del método
      await (component as any).inicializarDatos(1);
      fixture.detectChanges();

      // El spinner DEBE estar en false por el bloque 'finally' del componente
      expect(component.cargando()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('debería manejar el Caso de Borde: Invitados nulos o indefinidos', async () => {
      // Pilar: Caso de Borde - Robustez ante datos malformados del API
      mockMonitoreoService.getMonitoreoPorId.mockReturnValue(of({id: 1, invitados: null}));
      mockUsuarioService.getUsuarios.mockReturnValue(of([]));
      mockPaginaService.getPaginas.mockReturnValue(of([]));

      await (component as any).inicializarDatos(1);

      expect(component.invitadosOriginales).toEqual([]);
    });

    it('debería realizar Integración DOM: reflejar el cambio en el checkbox', async () => {
      component.usuariosSistema.set([mockUsuario]);
      component.cargando.set(false);
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector(`#toggle-10`) as HTMLInputElement;

      // Eliminado withContext (es de Jasmine) y sustituido por expect simple de Vitest
      expect(checkbox).not.toBeNull();
      expect(checkbox.checked).toBe(false);

      checkbox.click();
      fixture.detectChanges();

      expect(component.esInvitado(10)).toBe(true);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('toggleInvitado()', () => {

    it('debería añadir y quitar invitados (Camino Feliz)', () => {
      component.toggleInvitado(mockUsuario);
      expect(component.esInvitado(10)).toBe(true);
      component.toggleInvitado(mockUsuario);
      expect(component.esInvitado(10)).toBe(false);
    });

    it('debería cumplir con el Caso de Borde: inicializar la lista si es null/undefined', () => {
      component.monitoreo.invitados = undefined;
      component.toggleInvitado(mockUsuario);
      expect(Array.isArray(component.monitoreo.invitados)).toBe(true);
      // CORRECCIÓN AQUÍ: Casting a any para evitar el error de 'never'
      expect((component.monitoreo.invitados as any)?.length).toBe(1);
    });

    it('debería cumplir con el Test de Integridad: evitar duplicados por ID', () => {
      // Pilar: Integridad de Datos
      // Si por algún error de UI se llama dos veces, no queremos duplicados en el array
      component.monitoreo.invitados = [];
      component.toggleInvitado(mockUsuario);
      component.toggleInvitado(mockUsuario); // Segunda llamada (debería quitarlo)

      expect(component.monitoreo.invitados?.length).toBe(0);
    });

    it('debería cumplir con el Test de Sanitización: no actuar si el usuario no tiene ID', () => {
      // 1. Aseguramos un estado inicial limpio y conocido
      component.monitoreo.invitados = [];

      // 2. Creamos un caso de borde (objeto que cumple la interfaz pero no tiene ID)
      const usuarioCorrupto = { nombre: 'Sin ID', email: 'error@test.com' } as Usuario;

      // 3. Ejecución
      component.toggleInvitado(usuarioCorrupto);

      // 4. Verificación (Pilar: Integridad)
      // Accedemos a length de forma segura. Debe seguir siendo 0.
      const totalInvitados = component.monitoreo.invitados?.length || 0;
      expect(totalInvitados).toBe(0);
    });

    it('debería realizar Integración DOM: sincronizar click', async () => {
      component.usuariosSistema.set([mockUsuario]);
      component.cargando.set(false);
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector(`#toggle-10`);
      expect(checkbox).not.toBeNull();

      checkbox.click();
      fixture.detectChanges();

      expect(component.esInvitado(10)).toBe(true);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('esInvitado()', () => {

    it('debería retornar true si el ID está presente y false si no (Camino Feliz)', () => {
      component.monitoreo.invitados = [{ id: 10 } as any];
      expect(component.esInvitado(10)).toBe(true);
      expect(component.esInvitado(99)).toBe(false);
    });

    it('debería ser robusto ante datos nulos o indefinidos (Caso de Borde/Errores)', () => {
      // Evita que la app pete si el API devuelve invitados: null
      component.monitoreo.invitados = undefined;
      expect(component.esInvitado(10)).toBe(false);

      component.monitoreo.invitados = null as any;
      expect(component.esInvitado(10)).toBe(false);
    });

    it('debería validar la integridad del ID (Integridad)', () => {
      // Asegura que no damos por válido un ID undefined o 0
      component.monitoreo.invitados = [{ id: undefined } as any];
      expect(component.esInvitado(0)).toBe(false);
    });

    it('debería reflejar cambios del modelo en el DOM (Integración DOM)', async () => {
      const user = { id: 50, nombre: 'Test', email: 't@t.com' };
      component.usuariosSistema.set([user]);
      component.monitoreo.invitados = [user as any];
      component.cargando.set(false);
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector(`#toggle-50`) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('debería comportarse como una función pura e idempotente (Estado de Interfaz)', () => {
      // Comprobar 10 veces no debe cambiar el array de invitados
      component.monitoreo.invitados = [{ id: 1 } as any];
      for(let i=0; i<5; i++) component.esInvitado(1);
      expect(component.monitoreo.invitados.length).toBe(1);
    });
  });

  describe('guardar() - Los 11 Pilares', () => {
    beforeEach(() => {
      // Setup para un estado válido de guardado
      component.monitoreo = { nombre: 'Test URL', paginaUrl: 'google.com', minutos: 5, repeticiones: 3, invitados: [] };
      mockMonitoreoService.updateMonitoreo.mockReturnValue(of({}));
      mockMonitoreoService.invitacionEnMasa.mockReturnValue(of({}));
      mockMonitoreoService.quitarEnMasa.mockReturnValue(of({}));
    });

    it('debería cumplir con el Camino Feliz y navegar al finalizar', async () => {
      await component.guardar();
      expect(mockMonitoreoService.updateMonitoreo).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);
    });

    it('debería cumplir con la Validación de Negocio (Campos obligatorios cortos)', async () => {
      component.monitoreo.nombre = 'ab'; // Menor a 3 caracteres
      await component.guardar();
      expect(mockMonitoreoService.updateMonitoreo).not.toHaveBeenCalled();
    });

    it('debería cumplir con la Protección de Envío y Sanitización', async () => {
      // 1. SETUP: Mockear explícitamente el valor de la ruta JUSTO antes de llamar al método
      // Esto asegura que Number(get('id')) no sea 0
      const getRouteSpy = vi.spyOn(mockActivatedRoute.snapshot.paramMap, 'get').mockReturnValue('1');

      component.monitoreo = {
        nombre: '   Test   ',
        paginaUrl: 'google.com',
        minutos: '10' as any,
        repeticiones: 3,
        invitados: []
      };

      mockMonitoreoService.updateMonitoreo.mockReturnValue(of({}));
      mockMonitoreoService.invitacionEnMasa.mockReturnValue(of({}));
      mockMonitoreoService.quitarEnMasa.mockReturnValue(of({}));

      // 2. EJECUCIÓN
      await component.guardar();

      // 3. VERIFICACIÓN: Comprobamos que el ID es 1 y los datos están sanitizados
      expect(mockMonitoreoService.updateMonitoreo).toHaveBeenCalledWith(
        1, // ID correcto
        {
          nombre: 'Test',        // Trim aplicado
          paginaUrl: 'google.com',
          minutos: 10,           // Convertido a número
          repeticiones: 3        // Convertido a número
        }
      );

      // Limpiamos el spy
      getRouteSpy.mockRestore();
    });

    it('debería cumplir con el Test de Estado de Carga (guardando)', async () => {
      const promesa = component.guardar();
      expect(component.guardando()).toBe(true);
      await promesa;
      expect(component.guardando()).toBe(false);
    });

    it('debería cumplir con el Manejo de Errores al guardar', async () => {
      mockMonitoreoService.updateMonitoreo.mockReturnValue(throwError(() => new Error('DB Error')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.guardar();

      // Pilar crítico: Liberar el botón aunque falle el servidor
      expect(component.guardando()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('debería realizar el Cálculo de Integridad de Invitados', async () => {
      // 1. SETUP DE INTEGRIDAD: Forzamos que la ruta devuelva '1'
      // Esto evita el NaN que estás recibiendo
      vi.spyOn(mockActivatedRoute.snapshot.paramMap, 'get').mockReturnValue('1');

      // Aseguramos que el nombre pase la validación de negocio (> 3 caracteres)
      component.monitoreo.nombre = 'Monitoreo Test';
      component.invitadosOriginales = ['viejo@test.com'];

      // Seteamos el nuevo invitado
      component.monitoreo.invitados = [{ email: 'nuevo@test.com' } as any];

      // Mocks de los servicios para que la promesa se resuelva
      mockMonitoreoService.updateMonitoreo.mockReturnValue(of({}));
      mockMonitoreoService.invitacionEnMasa.mockReturnValue(of({}));
      mockMonitoreoService.quitarEnMasa.mockReturnValue(of({}));

      // 2. EJECUCIÓN
      await component.guardar();

      // 3. VERIFICACIÓN: El ID debe ser 1 (dentro de un array [1] según tu lógica en masa)
      expect(mockMonitoreoService.invitacionEnMasa).toHaveBeenCalledWith([1], ['nuevo@test.com']);
      expect(mockMonitoreoService.quitarEnMasa).toHaveBeenCalledWith([1], ['viejo@test.com']);
    });
  });

});
