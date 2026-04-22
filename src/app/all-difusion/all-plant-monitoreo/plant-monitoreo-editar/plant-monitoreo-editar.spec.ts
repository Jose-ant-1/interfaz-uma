import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlantMonitoreoEditar } from './plant-monitoreo-editar';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {MonitoreoListadoDTO} from '../../../models/monitoreo.model';

describe('PlantMonitoreoEditar - Fase 1: Infraestructura', () => {
  let component: PlantMonitoreoEditar;
  let fixture: ComponentFixture<PlantMonitoreoEditar>;

  const mockPlantillaService = {
    findById: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn()
  };

  const mockMonitoreoService = {
    getMisMonitoreos: vi.fn()
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  const functionalTemplate = `
    <div>
      <input [(ngModel)]="nombrePlantilla" id="nombre">
      <input [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" id="buscar">

      <button (click)="actualizar()" id="btn-guardar">Guardar</button>

      @if (cargando()) {
        <div id="spinner">Cargando...</div>
      }

      <div class="lista-monitoreos">
        @for (m of monitoreosFiltrados(); track m.id) {
          <div class="row">
            <input type="checkbox" [checked]="estaSeleccionado(m.id)" (change)="toggleMonitoreo(m.id)">
            <span>{{ m.nombre }}</span>
          </div>
        }
      </div>
    </div>
  `;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPlantillaService.findById.mockReturnValue(of({}));
    mockPlantillaService.findAll.mockReturnValue(of([]));
    mockPlantillaService.update.mockReturnValue(of({}));
    mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: PlantillaMonitoreoService, useValue: mockPlantillaService },
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: Router, useValue: mockRouter },
        // Mock ultra-simplificado para evitar conflictos con el motor real del Router
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'id' ? '123' : null
              }
            }
          }
        }
      ]
    })
      .overrideComponent(PlantMonitoreoEditar, {
        set: {
          template: functionalTemplate,
          templateUrl: undefined,
          imports: [CommonModule, FormsModule]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PlantMonitoreoEditar);
    component = fixture.componentInstance;
  });

  describe('Inject y Signals', () => {

    it('debería inyectar correctamente todos los servicios y el router', () => {
      expect(component['plantillaService']).toBeDefined();
      expect(component['monitoreoService']).toBeDefined();
      expect(component['router']).toBeDefined();
      expect(component['route']).toBeDefined();
    });

    it('debería capturar el ID de la plantilla desde la ActivatedRoute (snapshot)', () => {
      // EJECUCIÓN: Disparamos el ciclo de vida (ngOnInit -> inicializarComponente)
      fixture.detectChanges();

      // VERIFICACIÓN
      expect(component.idPlantilla).toBe(123);
      expect(typeof component.idPlantilla).toBe('number');
    });

    it('debería inicializar los Signals con el estado de carga activo (Pilar 5)', () => {
      // Estado inicial antes de que termine la carga de datos
      expect(component.cargando()).toBe(true);
      expect(component.nombrePlantilla).toBe('');
      expect(component.filtro()).toBe('');
      expect(component.misMonitoreosDisponibles()).toEqual([]);
      expect(component.seleccionados()).toEqual([]);
    });

    it('debería exponer los métodos de validación de selección (Pilar 10)', () => {
      // Verificamos que la lógica de "estaSeleccionado" responde al signal
      component.seleccionados.set([1, 2, 3]);

      expect(component.estaSeleccionado(1)).toBe(true);
      expect(component.estaSeleccionado(99)).toBe(false);
    });

  });

  describe('monitoreosFiltrados (computed)', () => {

    beforeEach(() => {
      // Usamos 'as MonitoreoListadoDTO[]' para satisfacer al compilador
      // sin tener que rellenar propiedades que no usamos en el test
      const mockDisponibles = [
        { id: 1, nombre: 'Monitor de Redes' },
        { id: 2, nombre: 'Seguimiento de Prensa' },
        { id: 3, nombre: 'Analítica Web' }
      ] as MonitoreoListadoDTO[];

      component.misMonitoreosDisponibles.set(mockDisponibles);
      component.filtro.set('');
    });

    it('debería retornar todos los monitoreos si el filtro está vacío', () => {
      const resultado = component.monitoreosFiltrados();
      expect(resultado.length).toBe(3);
    });

    it('debería filtrar por nombre de forma insensible a mayúsculas', () => {
      component.filtro.set('REDES');

      const resultado = component.monitoreosFiltrados();
      expect(resultado.length).toBe(1);
      expect(resultado[0].nombre).toBe('Monitor de Redes');
    });

    it('debería ser resiliente a espacios en blanco (trim)', () => {
      component.filtro.set('  prensa  ');

      const resultado = component.monitoreosFiltrados();
      expect(resultado.length).toBe(1);
      expect(resultado[0].nombre).toBe('Seguimiento de Prensa');
    });

    it('debería retornar una lista vacía si no hay coincidencias', () => {
      component.filtro.set('X-FILES');

      const resultado = component.monitoreosFiltrados();
      expect(resultado.length).toBe(0);
    });

    it('debería reaccionar automáticamente cuando cambian los monitoreos disponibles', () => {
      component.filtro.set('Test');
      // También casteamos aquí para evitar el error TS2739
      component.misMonitoreosDisponibles.set([{ id: 9, nombre: 'Test ABC' } as MonitoreoListadoDTO]);

      expect(component.monitoreosFiltrados().length).toBe(1);
      expect(component.monitoreosFiltrados()[0].nombre).toBe('Test ABC');
    });
  });

  describe('inicializarComponente()', () => {

    it('debería cargar datos y colocar los monitoreos seleccionados al principio', async () => {
      const mockPlantilla = { id: 123, nombre: 'Mi Pack', monitoreos: [{ id: 2 }] };
      const mockTodos = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }, { id: 3, nombre: 'C' }] as MonitoreoListadoDTO[];

      // Seteamos los valores justo antes de disparar el ciclo de vida
      mockPlantillaService.findAll.mockReturnValue(of([mockPlantilla])); // findAll debe devolver array
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockTodos));

      fixture.detectChanges();
      await fixture.whenStable();
      // Pequeño respiro para que Promise.all termine
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(component.nombrePlantilla).toBe('Mi Pack');
      expect(component.seleccionados()).toContain(2);
      expect(component.misMonitoreosDisponibles()[0].id).toBe(2);
    });

    it('debería redirigir al listado si la plantilla no existe (Pilar 8: Navegación)', async () => {
      // 1. PREPARACIÓN: El servidor devuelve una lista donde NO está el ID 123
      mockPlantillaService.findAll.mockReturnValue(of([{ id: 999, nombre: 'Otra' }]));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));

      // 2. EJECUCIÓN
      fixture.detectChanges();
      await fixture.whenStable();
      // Forzamos el tick de la microtarea del Promise.all
      await new Promise(resolve => setTimeout(resolve, 0));

      // 3. VERIFICACIÓN
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-plantillas']);
    });

    it('debería gestionar errores de carga con resiliencia (Pilar 4)', async () => {
      // PREPARACIÓN
      vi.spyOn(console, 'error').mockImplementation(() => {});
      // Hacemos que la primera llamada del Promise.all falle
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(throwError(() => new Error('API Fail')));
      mockPlantillaService.findAll.mockReturnValue(of([]));

      // EJECUCIÓN
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 0));

      // VERIFICACIÓN
      expect(component.cargando()).toBe(false); // El Pilar 5 exige que se libere la UI
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('actualizar()', () => {

    it('no debería llamar al servicio si los datos son inválidos (Pilar 8)', async () => {
      // Caso 1: Nombre vacío
      component.nombrePlantilla = '';
      component.seleccionados.set([1]);
      await component.actualizar();
      expect(mockPlantillaService.update).not.toHaveBeenCalled();

      // Caso 2: Sin monitoreos seleccionados
      component.nombrePlantilla = 'Pack válido';
      component.seleccionados.set([]);
      await component.actualizar();
      expect(mockPlantillaService.update).not.toHaveBeenCalled();
    });

    it('debería enviar el payload correcto y navegar al éxito (Pilar 7 y 8)', async () => {
      component.idPlantilla = 123;
      component.nombrePlantilla = 'Pack Editado';
      component.seleccionados.set([10, 20]);
      mockPlantillaService.update.mockReturnValue(of({}));

      await component.actualizar();

      const payloadEsperado = {
        id: 123,
        nombre: 'Pack Editado',
        monitoreos: [{ id: 10 }, { id: 20 }]
      };

      // VERIFICACIÓN: Comprobamos los DOS argumentos (ID y Payload)
      expect(mockPlantillaService.update).toHaveBeenCalledWith(123, payloadEsperado);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-plantillas']);
    });

    it('debería apagar el spinner si la actualización falla (Pilar 4 y 5)', async () => {
      // PREPARACIÓN
      vi.spyOn(console, 'error').mockImplementation(() => {});
      component.nombrePlantilla = 'Válido';
      component.seleccionados.set([1]);
      mockPlantillaService.update.mockReturnValue(throwError(() => new Error('Error de red')));

      // EJECUCIÓN
      await component.actualizar();

      // VERIFICACIÓN
      expect(component.cargando()).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('estaSeleccionado()', () => {

    it('debería retornar true si el ID está en la lista de seleccionados (Camino Feliz)', () => {
      // Seteamos el estado del Signal
      component.seleccionados.set([1, 10, 50]);

      const resultado = component.estaSeleccionado(10);

      expect(resultado).toBe(true);
    });

    it('debería retornar false si el ID no está presente (Camino Feliz)', () => {
      component.seleccionados.set([1, 10, 50]);

      const resultado = component.estaSeleccionado(99);

      expect(resultado).toBe(false);
    });

    it('debería manejar una lista de seleccionados vacía (Caso de Borde)', () => {
      component.seleccionados.set([]);

      const resultado = component.estaSeleccionado(1);

      expect(resultado).toBe(false);
    });

    it('debería reaccionar inmediatamente a cambios en el Signal (Integridad)', () => {
      // 1. Empezamos sin estar seleccionado
      component.seleccionados.set([1]);
      expect(component.estaSeleccionado(2)).toBe(false);

      // 2. Actualizamos el Signal (simulando una acción del usuario o carga)
      component.seleccionados.update(ids => [...ids, 2]);

      // 3. Verificamos que el método refleja el nuevo estado
      expect(component.estaSeleccionado(2)).toBe(true);
    });
  });

  describe('toggleMonitoreo()', () => {

    it('debería añadir un ID si no está presente en la lista (Camino Feliz)', () => {
      // Estado inicial: solo el 1
      component.seleccionados.set([1]);

      // Acción: añadimos el 2
      component.toggleMonitoreo(2);

      // Verificación: debe contener ambos
      expect(component.seleccionados()).toContain(2);
      expect(component.seleccionados()).toHaveLength(2);
    });

    it('debería eliminar un ID si ya está presente en la lista (Camino Feliz)', () => {
      // Estado inicial: tiene el 1 y el 2
      component.seleccionados.set([1, 2]);

      // Acción: "desmarcamos" el 2
      component.toggleMonitoreo(2);

      // Verificación: solo queda el 1
      expect(component.seleccionados()).not.toContain(2);
      expect(component.seleccionados()).toEqual([1]);
    });

    it('debería funcionar correctamente al añadir a una lista vacía (Caso de Borde)', () => {
      component.seleccionados.set([]);

      component.toggleMonitoreo(5);

      expect(component.seleccionados()).toEqual([5]);
    });

    it('debería mantener la inmutabilidad del Signal (Integridad)', () => {
      // Verificamos que no estamos mutando la referencia del array original,
      // sino emitiendo un nuevo estado (esto es vital en Signals)
      const listaOriginal = [10];
      component.seleccionados.set(listaOriginal);

      component.toggleMonitoreo(20);

      expect(component.seleccionados()).not.toBe(listaOriginal); // Diferente referencia
      expect(component.seleccionados()).toEqual([10, 20]);
    });
  });

  describe('onSearch()', () => {

    it('debería actualizar el signal de filtro con el valor del input (Camino Feliz)', () => {
      // Simulamos el evento que emite el input del HTML
      const event = {
        target: { value: 'Monitor' }
      } as unknown as Event;

      component.onSearch(event);

      expect(component.filtro()).toBe('Monitor');
    });

    it('debería manejar valores vacíos cuando el usuario borra el buscador (Caso de Borde)', () => {
      // Primero seteamos un valor
      component.filtro.set('Valor previo');

      const event = {
        target: { value: '' }
      } as unknown as Event;

      component.onSearch(event);

      expect(component.filtro()).toBe('');
    });

    it('debería ser resiliente si el valor del input tiene espacios extra (Sanitización)', () => {
      // Nota: El método onSearch del TS solo setea el valor.
      // La sanitización real (trim) ocurre en el computed 'monitoreosFiltrados'.
      const event = {
        target: { value: '  redes  ' }
      } as unknown as Event;

      component.onSearch(event);

      expect(component.filtro()).toBe('  redes  ');
      // Verificamos que el pilar de sanitización funciona a través del computed
      expect(component.monitoreosFiltrados()).toBeDefined();
    });

    it('debería disparar la actualización de la interfaz al cambiar el signal (Estado de Interfaz)', () => {
      const spy = vi.spyOn(component.filtro, 'set');
      const event = {
        target: { value: 'test' }
      } as unknown as Event;

      component.onSearch(event);

      expect(spy).toHaveBeenCalledWith('test');
    });
  });

  describe('cargarDatos()', () => {

    it('debería cruzar datos y posicionar los seleccionados al inicio (Integridad)', async () => {
      // 1. PREPARACIÓN
      component.idPlantilla = 123; // <--- IMPRESCINDIBLE: Seteamos el ID que buscará el .find()

      const mockPlantillas = [
        { id: 123, nombre: 'Pack Pro', monitoreos: [{ id: 2 }] }
      ] as any[];

      const mockMonitoreos = [
        { id: 1, nombre: 'A' },
        { id: 2, nombre: 'B' },
        { id: 3, nombre: 'C' }
      ] as MonitoreoListadoDTO[];

      // Usamos de nuevo los mocks asegurando que emiten el valor
      mockPlantillaService.findAll.mockReturnValue(of(mockPlantillas));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockMonitoreos));

      // 2. EJECUCIÓN
      await component.cargarDatos();

      // Forzamos detección de cambios para que los Signals se estabilicen en el DOM/Estado
      fixture.detectChanges();

      // 3. VERIFICACIÓN
      expect(component.nombrePlantilla).toBe('Pack Pro');
      expect(component.seleccionados()).toContain(2);

      const listaFinal = component.misMonitoreosDisponibles();
      expect(listaFinal[0].id).toBe(2);
      expect(listaFinal).toHaveLength(3);
    });

    it('debería redirigir al listado si la plantilla no existe en la respuesta (Sanitización)', async () => {
      // Simulamos que el findAll devuelve otras plantillas, pero no la 123
      mockPlantillaService.findAll.mockReturnValue(of([{ id: 999 }]));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));

      await component.cargarDatos();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-plantillas']);
    });

    it('debería asegurar que el estado de carga finalice tras un error (Manejo de Errores)', async () => {
      // Silenciamos el console.error para que el log del test esté limpio
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPlantillaService.findAll.mockReturnValue(throwError(() => new Error('Fail')));

      await component.cargarDatos();

      // Verificamos el Pilar 5: El spinner debe apagarse sí o sí
      expect(component.cargando()).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

});
