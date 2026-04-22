import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlantUsuarioAnyadir } from './plant-usuario-anyadir';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Router } from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {Usuario} from '../../../models/usuario.model';

describe('PlantUsuarioAnyadir - Fase 1: Infraestructura', () => {
  let component: PlantUsuarioAnyadir;
  let fixture: ComponentFixture<PlantUsuarioAnyadir>;

  // --- 1. MOCKS (Pilar: Integridad y Contrato) ---
  const mockPlantillaUsuarioService = {
    create: vi.fn()
  };

  const mockUsuarioService = {
    getUsuarios: vi.fn(),
    getPerfil: vi.fn()
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  // --- 2. TEMPLATE FUNCIONAL (Control Flow Angular 17+) ---
  const functionalTemplate = `
    <div>
      <input [(ngModel)]="nombreGrupo" id="nombre">
      <input [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" id="buscar">

      <button (click)="guardar()" id="btn-guardar">Crear</button>

      @if (cargando()) {
        <div id="spinner">Cargando...</div>
      }
    </div>
  `;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Respuestas por defecto (Pilar: Integridad)
    mockUsuarioService.getPerfil.mockReturnValue(of({ id: 99 }));
    mockUsuarioService.getUsuarios.mockReturnValue(of([]));
    mockPlantillaUsuarioService.create.mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      // CLAVE 1: Eliminamos 'PlantUsuarioAnyadir' de aquí para evitar que intente
      // resolver el 'templateUrl' real antes del override.
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: PlantillaUsuarioService, useValue: mockPlantillaUsuarioService },
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: Router, useValue: mockRouter }
      ]
    })
      // CLAVE 2: Sobreescribimos el componente ANTES de compilar
      .overrideComponent(PlantUsuarioAnyadir, {
        set: {
          template: functionalTemplate,
          templateUrl: undefined, // Forzamos la anulación del recurso externo
          imports: [CommonModule, FormsModule]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PlantUsuarioAnyadir);
    component = fixture.componentInstance;
  });

  // --- 3. TESTS DE ARRANQUE (Pilar: Infraestructura) ---

  it('debería instanciar el componente y sus dependencias', () => {
    expect(component).toBeTruthy();
    expect(component['plantillaUsuarioService']).toBeDefined();
    expect(component['usuarioService']).toBeDefined();
  });

  it('debería validar el estado inicial de la interfaz (Pilar: Interfaz)', async () => {
    // Forzamos que no cargue para ver los inputs
    component.cargando.set(false);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement;

    // Verificamos IDs críticos (Evitamos el error 'null' anterior)
    expect(compiled.querySelector('#nombre')).toBeTruthy();
    expect(compiled.querySelector('#buscar')).toBeTruthy();
  });

  describe('Inject y Signals', () => {

    describe('Pilar 1: Inyección y Contrato', () => {
      it('debería garantizar la presencia de las dependencias inyectadas', () => {
        // Validamos que los servicios se hayan inyectado correctamente vía inject()
        expect(component['plantillaUsuarioService']).toBeDefined();
        expect(component['usuarioService']).toBeDefined();
        expect(component['router']).toBeDefined();
      });

      it('debería inicializar con el estado correcto (Pilar: Estado Inicial)', () => {
        expect(component.nombreGrupo).toBe('');
        expect(component.usuariosDisponibles()).toEqual([]);
        expect(component.seleccionados()).toEqual([]);
        expect(component.cargando()).toBe(false);
      });
    });

    describe('Pilar 9 y 10: Reactividad de Negocio e Integridad', () => {

      beforeEach(() => {
        // Seteamos una lista base de usuarios para probar la reactividad
        const mockUsers: Usuario[] = [
          { id: 1, nombre: 'Ana García', email: 'ana@test.com' },
          { id: 2, nombre: 'Pedro López', email: 'pedro@test.com' }
        ];
        component.usuariosDisponibles.set(mockUsers);
      });

      it('debería filtrar usuarios por nombre o email de forma reactiva (Pilar 9)', () => {
        // Filtrar por nombre
        component.filtro.set('Ana');
        expect(component.usuariosFiltrados().length).toBe(1);
        expect(component.usuariosFiltrados()[0].nombre).toBe('Ana García');

        // Filtrar por email
        component.filtro.set('pedro@');
        expect(component.usuariosFiltrados().length).toBe(1);
        expect(component.usuariosFiltrados()[0].email).toBe('pedro@test.com');
      });

      it('debería gestionar la selección de usuarios manteniendo la integridad (Pilar 10)', () => {
        // Seleccionar
        component.toggleUsuario(1);
        expect(component.seleccionados()).toContain(1);
        expect(component.estaSeleccionado(1)).toBe(true);

        // Deseleccionar
        component.toggleUsuario(1);
        expect(component.seleccionados()).not.toContain(1);
        expect(component.estaSeleccionado(1)).toBe(false);
      });

      it('debería retornar la lista completa si el filtro está vacío', () => {
        component.filtro.set('   ');
        expect(component.usuariosFiltrados().length).toBe(2);
      });
    });
  });

  describe('ngOnInit', () => {

    it('debería cargar usuarios disponibles y excluir al perfil propio al iniciar', async () => {
      // --- 1. PREPARACIÓN ---
      const mockPerfil = { id: 99, nombre: 'Yo' };
      const mockUsers = [
        { id: 1, nombre: 'Usuario A', email: 'a@test.com' },
        { id: 99, nombre: 'Yo', email: 'yo@test.com' },
        { id: 2, nombre: 'Usuario B', email: 'b@test.com' }
      ];

      mockUsuarioService.getPerfil.mockReturnValue(of(mockPerfil));
      mockUsuarioService.getUsuarios.mockReturnValue(of(mockUsers));

      // --- 2. EJECUCIÓN ---
      // Trigger ngOnInit
      fixture.detectChanges();

      // Esperamos a que la lógica asíncrona interna termine
      await fixture.whenStable();

      // REFUERZO: Forzamos a vaciar la cola de microtareas para que el 'finally' se ejecute
      await Promise.resolve();

      // Sincronizamos la vista con el estado final de los Signals
      fixture.detectChanges();

      // --- 3. VERIFICACIÓN ---
      // Si aquí sigue en true, es que el finally del componente falló o no se alcanzó
      expect(component.cargando()).toBe(false);
      expect(component.usuariosDisponibles().length).toBe(2);
      expect(component.usuariosDisponibles().find(u => u.id === 99)).toBeUndefined();
    });

    it('debería gestionar errores en la carga inicial (Pilar 4: Resiliencia)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.getPerfil.mockReturnValue(throwError(() => new Error('API Fail')));

      await (component as any).inicializarComponente();

      expect(component.cargando()).toBe(false); // El spinner debe morir siempre
      expect(console.error).toHaveBeenCalled();
    });

    it('debería apagar el spinner incluso si la carga de datos falla (Pilar 4: Resiliencia)', async () => {
      // 1. FORZAMOS ERROR
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.getPerfil.mockReturnValue(throwError(() => new Error('Error de Red')));

      // 2. EJECUCIÓN
      // Accedemos al método aunque sea privado para poder hacer el 'await'
      await (component as any).inicializarComponente();

      // 3. VERIFICACIÓN
      expect(component.cargando()).toBe(false); // PILAR 5: El spinner se apaga siempre
      expect(console.error).toHaveBeenCalled(); // El error se captura, no rompe la app
    });

  });

  describe('computed', () => {

    beforeEach(() => {
      component.usuariosDisponibles.set([
        { id: 1, nombre: 'Nacho Libre', email: 'nacho@mexico.com' },
        { id: 2, nombre: 'Esqueleto', email: 'lucha@libre.com' }
      ]);
    });

    it('debería filtrar por nombre (insensible a mayúsculas)', () => {
      component.filtro.set('NACHO');
      expect(component.usuariosFiltrados().length).toBe(1);
      expect(component.usuariosFiltrados()[0].id).toBe(1);
    });

    it('debería filtrar por email', () => {
      component.filtro.set('lucha@');
      expect(component.usuariosFiltrados().length).toBe(1);
      expect(component.usuariosFiltrados()[0].id).toBe(2);
    });

    it('debería devolver todos si el filtro está vacío o tiene espacios', () => {
      component.filtro.set('  ');
      expect(component.usuariosFiltrados().length).toBe(2);
    });
  });

  describe('guardar()', () => {

    it('no debería llamar al servicio si los datos son inválidos (Pilar 8: Sanitización)', async () => {
      const spyCreate = vi.spyOn(mockPlantillaUsuarioService, 'create');

      // Caso 1: Nombre vacío
      component.nombreGrupo = '';
      component.seleccionados.set([1]);
      await component.guardar();

      // Caso 2: Sin usuarios
      component.nombreGrupo = 'Grupo Nuevo';
      component.seleccionados.set([]);
      await component.guardar();

      expect(spyCreate).not.toHaveBeenCalled();
    });

    it('debería bloquear la re-entrada y transformar los datos correctamente (Pilares 6 y 7)', async () => {
      // 1. PREPARACIÓN
      component.nombreGrupo = 'Equipo Alpha';
      component.seleccionados.set([10, 20]);

      // Simulamos que el servicio tarda para verificar el estado de carga
      const createSubject = new Subject<any>();
      mockPlantillaUsuarioService.create.mockReturnValue(createSubject.asObservable());

      // 2. EJECUCIÓN
      const pGuardar = component.guardar();

      // Pilar 6: Bloqueo de Re-entrada (El botón debería estar deshabilitado en el HTML por esto)
      expect(component.cargando()).toBe(true);

      // Emitimos y completamos para resolver el firstValueFrom
      createSubject.next({});
      createSubject.complete();

      await pGuardar;

      // 3. VERIFICACIÓN
      // Pilar 7: Protección de Envío (Verificar formato de payload: IDs -> Objetos)
      expect(mockPlantillaUsuarioService.create).toHaveBeenCalledWith({
        nombre: 'Equipo Alpha',
        usuarios: [{ id: 10 }, { id: 20 }]
      });

      // Pilar 11: Integración (Navegación tras éxito)
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-grupos']);
      expect(component.cargando()).toBe(false);
    });

    it('debería liberar el estado de carga si la creación falla (Pilar 4: Resiliencia)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      component.nombreGrupo = 'Error Group';
      component.seleccionados.set([1]);

      mockPlantillaUsuarioService.create.mockReturnValue(throwError(() => new Error('DB Error')));

      await component.guardar();

      // El spinner debe apagarse para que el usuario pueda corregir o reintentar
      expect(component.cargando()).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('toggleUsuario()', () => {

    it('debería añadir un ID a la lista si no está presente', () => {
      // Estado inicial vacío
      component.seleccionados.set([]);

      component.toggleUsuario(5);

      expect(component.seleccionados()).toContain(5);
      expect(component.seleccionados().length).toBe(1);
    });

    it('debería eliminar un ID de la lista si ya existe (Toggle)', () => {
      // Estado inicial con datos
      component.seleccionados.set([1, 5, 10]);

      component.toggleUsuario(5);

      expect(component.seleccionados()).not.toContain(5);
      expect(component.seleccionados()).toEqual([1, 10]);
    });

    it('debería ser inmutable al actualizar el signal', () => {
      // Este test verifica que no estamos haciendo push() al array original
      // sino creando una referencia nueva (Pilar de Inmutabilidad de Signals)
      const listaInicial = [1];
      component.seleccionados.set(listaInicial);

      component.toggleUsuario(2);

      expect(component.seleccionados()).not.toBe(listaInicial); // Diferente referencia
      expect(component.seleccionados()).toEqual([1, 2]);
    });

    it('debería retornar correctamente el estado con estaSeleccionado()', () => {
      component.seleccionados.set([42]);

      expect(component.estaSeleccionado(42)).toBe(true);
      expect(component.estaSeleccionado(99)).toBe(false);
    });
  });

  describe('Pilar 11: Eventos de Interfaz (onSearch)', () => {

    it('debería actualizar el signal de filtro cuando el usuario escribe en el buscador', () => {
      // 1. Simulamos el evento que emite el input (tipo InputEvent)
      const mockEvent = {
        target: { value: 'Nacho' }
      } as unknown as Event;

      // 2. EJECUCIÓN
      component.onSearch(mockEvent);

      // 3. VERIFICACIÓN
      // Comprobamos que el signal cambió. La reactividad del computed
      // ya sabemos que funciona por los tests anteriores.
      expect(component.filtro()).toBe('Nacho');
    });

    it('debería actualizar el signal de filtro al escribir (Pilar 11)', () => {
      const mockEvent = { target: { value: 'Nacho' } } as unknown as Event;

      component.onSearch(mockEvent);

      expect(component.filtro()).toBe('Nacho');
    });
  });


});
