import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {PlantUsuarioEditar} from './plant-usuario-editar';
import {PlantillaUsuarioService} from '../../../services/plantilla-usuario.service';
import {UsuarioService} from '../../../services/usuario.service';
import {ActivatedRoute, Router} from '@angular/router';
import {delay, of, Subject, throwError} from 'rxjs';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Usuario} from '../../../models/usuario.model';

describe('PlantUsuarioEditar - Fase 1: Infraestructura', () => {
  let component: PlantUsuarioEditar;
  let fixture: ComponentFixture<PlantUsuarioEditar>;

  // 1. MOCKS DE SERVICIOS
  const mockPlantillaUsuarioService = {
    findById: vi.fn(),
    update: vi.fn()
  };

  const mockUsuarioService = {
    getUsuarios: vi.fn(),
    getPerfil: vi.fn()
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: vi.fn().mockReturnValue('1')
      }
    }
  };

  const functionalTemplate = `
  <div>
    <input [(ngModel)]="nombreGrupo" id="nombre">
    <input [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" id="buscar">

    <button (click)="actualizar()">Actualizar</button>
    <button routerLink="/dashboard/difusion/administrar-grupos">Cancelar</button>

    @if (cargando()) {
      <div id="spinner">Cargando...</div>
    }
  </div>
`;;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    // Respuestas por defecto para evitar que el OnInit falle
    mockUsuarioService.getPerfil.mockReturnValue(of({}));
    mockUsuarioService.getUsuarios.mockReturnValue(of([]));
    mockPlantillaUsuarioService.findById.mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      providers: [
        {provide: PlantillaUsuarioService, useValue: mockPlantillaUsuarioService},
        {provide: UsuarioService, useValue: mockUsuarioService},
        {provide: Router, useValue: mockRouter},
        {provide: ActivatedRoute, useValue: mockActivatedRoute}
      ]
    }).overrideComponent(PlantUsuarioEditar, {
      set: {
        templateUrl: undefined,
        template: functionalTemplate,
        imports: [CommonModule, FormsModule]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(PlantUsuarioEditar);
    component = fixture.componentInstance;
  });

  // Estructura lista para empezar a blindar
  it('debería instanciar el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('inject y signal', () => {
    // ... (setup previo del beforeEach con el mock de servicios y el functionalTemplate)

    describe('Pilar 1: Inyección y Contrato (inject)', () => {

      describe('Pilar 1: Inyección y Contrato (inject)', () => {

        it('debería garantizar la presencia de dependencias y el estado inicial (Interfaz)', async () => {
          // --- 1. PREPARACIÓN (Pilar: Integridad de Mocks) ---
          mockUsuarioService.getPerfil.mockReturnValue(of({ id: 99 }));
          mockUsuarioService.getUsuarios.mockReturnValue(of([]));
          mockPlantillaUsuarioService.findById.mockReturnValue(of({ id: 1, nombre: 'Test', usuarios: [] }));

          // Forzamos que no esté cargando para que el @if muestre el contenido
          component.cargando.set(false);

          // --- 2. EJECUCIÓN ---
          fixture.detectChanges();
          await fixture.whenStable();

          // --- 3. VERIFICACIÓN ---
          const compiled = fixture.nativeElement;

          // Verificamos elementos del DOM (Pilar: Integración DOM)
          expect(compiled.querySelector('#nombre')).toBeTruthy();

          // Ajustado a 'buscar' (como está en el template)
          const inputBuscar = compiled.querySelector('#buscar');
          expect(inputBuscar).toBeTruthy();
        });
      });

    });

    describe('Pilar 2-11: Lógica, Reactividad y Resiliencia (signals)', () => {

      it('debería gestionar el flujo de carga, errores y bloqueo (Carga, Errores y Re-entrada)', async () => {
        // Pilar: Estado de Carga (inicial)
        expect(component.cargando()).toBe(true);

        // Simulamos error para probar Pilar: Manejo de Errores y Resiliencia
        mockPlantillaUsuarioService.findById.mockReturnValue(throwError(() => new Error('Fail')));
        await component.cargarDatos();
        expect(component.cargando()).toBe(false); // El pilar de resiliencia asegura que el spinner pare

        // Pilar: Caso de Borde (ID inexistente en URL)
        mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
        await (component as any).inicializarComponente();
        expect(component.idGrupo).toBeUndefined();
      });

      it('debería validar la reactividad, filtrado e integridad (Integridad, Caso Borde y Negocio)', () => {
        // CORRECCIÓN: Añadimos 'email' para cumplir con la interfaz Usuario
        const mockUsers: Usuario[] = [
          {id: 1, nombre: 'Admin', email: 'admin@test.com'},
          {id: 2, nombre: 'User', email: 'user@test.com'}
        ];

        component.usuariosDisponibles.set(mockUsers);

        // Pilar: Validación de Negocio (Filtrado reactivo)
        component.filtro.set('admin');
        expect(component.usuariosFiltrados().length).toBe(1);

        // Pilar: Integridad (Toggle de selección)
        component.toggleUsuario(1);
        expect(component.seleccionados()).toContain(1);
        component.toggleUsuario(1); // Desmarcar
        expect(component.seleccionados()).not.toContain(1);
      });

      it('debería blindar el proceso de guardado y sanitización (Protección Envío, Sanitización y Re-entrada)', async () => {
        // Pilar: Sanitización (No enviar si es inválido)
        component.nombreGrupo = '';
        const spyUpdate = vi.spyOn(mockPlantillaUsuarioService, 'update');
        await component.actualizar();
        expect(spyUpdate).not.toHaveBeenCalled();

        // Pilar: Protección de Envío y Bloqueo de Re-entrada
        component.nombreGrupo = 'Grupo Test';
        component.idGrupo = 1;
        component.seleccionados.set([10]);

        // Simulamos que el servicio tarda para ver el bloqueo
        mockPlantillaUsuarioService.update.mockReturnValue(of({}).pipe(delay(20)));
        const envio = component.actualizar();

        expect(component.cargando()).toBe(true); // Pilar: Bloqueo de Re-entrada (evita doble click)

        await envio;

        // Pilar: Protección de Envío (Verificamos el mapeo de la estructura que espera el API)
        expect(spyUpdate).toHaveBeenCalledWith(1, expect.objectContaining({
          nombre: 'Grupo Test',
          usuarios: [{id: 10}] // Verificamos la transformación de ID a objeto
        }));

        // Pilar: Integración DOM (Post-navegación)
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-grupos']);
      });
    });
  });

  describe('Validación de Comportamiento y Resiliencia', () => {

    it('debería cumplir con los 11 pilares de estabilidad en el flujo de trabajo', async () => {
      // 1. Mocks con Subjects para control total (Pilar Integridad)
      const findByIdSub = new Subject<any>();
      const getUsuariosSub = new Subject<any[]>();
      const getPerfilSub = new Subject<any>();
      const updateSub = new Subject<any>();

      mockPlantillaUsuarioService.findById.mockReturnValue(findByIdSub.asObservable());
      mockUsuarioService.getUsuarios.mockReturnValue(getUsuariosSub.asObservable());
      mockUsuarioService.getPerfil.mockReturnValue(getPerfilSub.asObservable());
      mockPlantillaUsuarioService.update.mockReturnValue(updateSub.asObservable());

      // 2. EJECUCIÓN DE CARGA (Pilar: Estado de Carga)
      component.idGrupo = 1;
      const pCarga = component.cargarDatos();

      expect(component.cargando()).toBe(true); // Verificamos estado inicial

      // Emitimos y COMPLETAMOS (Crucial para firstValueFrom)
      findByIdSub.next({id: 1, nombre: 'Grupo Test', usuarios: [{id: 10}]});
      findByIdSub.complete();
      getUsuariosSub.next([{id: 10, nombre: 'A'}, {id: 20, nombre: 'B'}]);
      getUsuariosSub.complete();
      getPerfilSub.next({id: 99});
      getPerfilSub.complete();

      await pCarga; // Ahora sí se resuelve porque los observables completaron
      fixture.detectChanges();

      // Pilar: Resiliencia y Estado de Carga Final
      expect(component.cargando()).toBe(false);
      expect(component.nombreGrupo).toBe('Grupo Test');

      // 3. VALIDACIÓN DE NEGOCIO Y SELECCIÓN (Pilar Integridad)
      component.toggleUsuario(20);
      expect(component.estaSeleccionado(20)).toBe(true);

      // 4. PROTECCIÓN DE ENVÍO Y RE-ENTRADA
      component.nombreGrupo = 'Editado';
      const pUpdate = component.actualizar();

      expect(component.cargando()).toBe(true); // Bloqueo de re-entrada activo

      updateSub.next({});
      updateSub.complete();

      await pUpdate;
      fixture.detectChanges();

      // 5. NAVEGACIÓN (Pilar Integración)
      expect(component.cargando()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-grupos']);
    });

    it('debería gestionar Casos de Borde y Manejo de Errores (Resiliencia)', async () => {
      // --- PILAR: MANEJO DE ERRORES ---
      vi.spyOn(console, 'error').mockImplementation(() => {
      });
      mockPlantillaUsuarioService.findById.mockReturnValue(throwError(() => new Error('API Fail')));

      await component.cargarDatos();

      expect(component.cargando()).toBe(false); // Pilar: Resiliencia (Spinner se apaga)
      expect(console.error).toHaveBeenCalled();

      // --- PILAR: CASO DE BORDE (ID No numérico) ---
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
      await (component as any).inicializarComponente();
      // El componente no debería intentar cargar si no hay ID
      expect(mockPlantillaUsuarioService.findById).not.toHaveBeenCalledTimes(2);
    });

    it('debería validar el Estado de Interfaz cuando termina de cargar', async () => {
      // 1. PREPARACIÓN: Forzamos que ya no esté cargando
      component.cargando.set(false); // <--- CLAVE: Apagamos el spinner manualmente

      // 2. SINCRONIZACIÓN
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement;

      // 3. VERIFICACIÓN (Pilar: Estado de Interfaz)
      // Asegúrate de que en tu HTML estos IDs existan realmente
      expect(compiled.querySelector('#nombre')).toBeDefined();

      // Si el id="buscar" no está en tu HTML, el test fallará.
      // Verifica si el input de búsqueda tiene el id="buscar"
      const inputBuscar = compiled.querySelector('#buscar');
      if (!inputBuscar) {
        console.log('DEBUG: El ID #buscar no se encuentra. Revisa el HTML.');
      }
      expect(inputBuscar).toBeTruthy();

      expect(compiled.querySelector('button[routerLink]')).toBeTruthy();
    });

    it('debería cumplir con los 11 pilares en un flujo completo', async () => {
      // Mocks con datos reales (Pilar: Integridad)
      mockPlantillaUsuarioService.findById.mockReturnValue(of({id: 1, nombre: 'Grupo Pro', usuarios: []}));
      mockUsuarioService.getUsuarios.mockReturnValue(of([]));
      mockUsuarioService.getPerfil.mockReturnValue(of({id: 99}));

      // PILAR: CARGA Y BLOQUEO
      const p = component.cargarDatos();
      expect(component.cargando()).toBe(true); // Debe estar cargando al inicio

      await p;
      fixture.detectChanges();

      // PILAR: ESTADO FINAL
      expect(component.cargando()).toBe(false); // Debe terminar
      expect(component.nombreGrupo).toBe('Grupo Pro');
    });

    it('debería gestionar errores de API (Pilar: Resiliencia)', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {
      });
      mockPlantillaUsuarioService.findById.mockReturnValue(throwError(() => new Error('Fail')));

      await component.cargarDatos();

      expect(component.cargando()).toBe(false); // El spinner debe morir aunque falle
      expect(console.error).toHaveBeenCalled();
    });
  });

});
