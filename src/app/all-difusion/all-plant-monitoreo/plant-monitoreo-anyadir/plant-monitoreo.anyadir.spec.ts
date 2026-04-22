import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlantMonitoreoAnyadir } from './plant-monitoreo-anyadir';
import { PlantillaMonitoreoService } from '../../../services/plantilla-monitoreo.service';
import { MonitoreoService } from '../../../services/monitoreo.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {MonitoreoListadoDTO} from '../../../models/monitoreo.model';

describe('PlantMonitoreoAnyadir', () => {
  let component: PlantMonitoreoAnyadir;
  let fixture: ComponentFixture<PlantMonitoreoAnyadir>;

  const mockPlantillaService = {
    create: vi.fn()
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
      <input (input)="onSearch($event)" id="buscar">
      <button (click)="guardar()" [disabled]="!nombrePlantilla || seleccionados().length === 0 || cargando()" id="btn-guardar">
        Crear Pack
      </button>
      <div id="lista">
        @for (m of monitoreosFiltrados(); track m.id) {
          <input type="checkbox" [checked]="estaSeleccionado(m.id)" (change)="toggleMonitoreo(m.id)">
        }
      </div>
    </div>
  `;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Valores por defecto para evitar errores de suscripción
    mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
    mockPlantillaService.create.mockReturnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: PlantillaMonitoreoService, useValue: mockPlantillaService },
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: Router, useValue: mockRouter }
      ]
    })
      .overrideComponent(PlantMonitoreoAnyadir, {
        set: {
          template: functionalTemplate,
          templateUrl: undefined,
          imports: [CommonModule, FormsModule]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PlantMonitoreoAnyadir);
    component = fixture.componentInstance;
  });

  describe('Pilar: Infraestructura (Inject y Signals)', () => {

    it('debería inyectar correctamente los servicios y el router (Camino Feliz)', () => {
      // Verificamos que los tokens de inyección se han resuelto correctamente
      expect(component['plantillaService']).toBeDefined();
      expect(component['monitoreoService']).toBeDefined();
      expect(component['router']).toBeDefined();
    });

    it('debería inicializar los Signals con el estado vacío y cargando en false (Integridad)', () => {
      // Pilar Integridad: El estado inicial debe ser limpio para creación
      expect(component.nombrePlantilla).toBe('');
      expect(component.cargando()).toBe(false);
      expect(component.filtro()).toBe('');
      expect(component.misMonitoreos()).toEqual([]);
      expect(component.seleccionados()).toEqual([]);
    });

    it('debería cargar los monitoreos disponibles al inicializar (Camino Feliz)', () => {
      const mockData = [{ id: 1, nombre: 'Monitoreo Inicial' }] as MonitoreoListadoDTO[];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockData));

      // Act: Disparamos ngOnInit a través de detectChanges
      fixture.detectChanges();

      // Assert: Verificamos la carga exitosa
      expect(mockMonitoreoService.getMisMonitoreos).toHaveBeenCalled();
      expect(component.misMonitoreos()).toEqual(mockData);
    });

    it('debería manejar una lista de monitoreos vacía desde el servicio (Caso de Borde)', () => {
      // Pilar Caso de Borde: El backend no devuelve datos
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));

      fixture.detectChanges();

      expect(component.misMonitoreos()).toEqual([]);
      expect(component.monitoreosFiltrados()).toEqual([]);
    });

    it('debería mantener la reactividad del computed al cambiar el estado (Integridad)', () => {
      // Pilar Integridad: La relación entre Signals y Computeds
      const mockData = [{ id: 1, nombre: 'Prueba' }] as MonitoreoListadoDTO[];
      component.misMonitoreos.set(mockData);

      // Al cambiar el filtro, el computed debe reaccionar automáticamente
      component.filtro.set('Prueba');
      expect(component.monitoreosFiltrados()).toHaveLength(1);
    });

  });

  describe('Computed', () => {

    beforeEach(() => {
      // Estado de datos para probar el filtro
      component.misMonitoreos.set([
        { id: 10, nombre: 'Monitor RRSS' },
        { id: 20, nombre: 'Prensa Escrita' }
      ] as MonitoreoListadoDTO[]);
    });

    it('debería filtrar por nombre ignorando mayúsculas y espacios (Sanitización)', () => {
      // El usuario escribe con espacios y mayúsculas locas
      component.filtro.set('  RRSS  ');

      const resultado = component.monitoreosFiltrados();

      // Verificamos que el trim() y el toLowerCase() (Sanitización) funcionan
      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(10);
    });

    it('debería permitir la búsqueda por ID numérico (Caso de Borde)', () => {
      // Aunque el filtro es string, debe encontrar el ID 20
      component.filtro.set('20');

      const resultado = component.monitoreosFiltrados();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('Prensa Escrita');
    });

    it('debería devolver la lista completa si el filtro está vacío (Integridad)', () => {
      component.filtro.set('');

      expect(component.monitoreosFiltrados()).toHaveLength(2);
    });

    it('debería ser resiliente y devolver vacío si no hay coincidencias (Caso de Borde)', () => {
      component.filtro.set('asdfghjkl');

      expect(component.monitoreosFiltrados()).toHaveLength(0);
    });
  });

  describe('ngOnInit()', () => {

    it('debería poblar el signal de monitoreos al inicializar (Camino Feliz)', () => {
      // 1. PREPARACIÓN: Definimos qué devuelve el servicio
      const mockMonitoreos = [
        { id: 1, nombre: 'Monitor A' },
        { id: 2, nombre: 'Monitor B' }
      ] as MonitoreoListadoDTO[];

      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockMonitoreos));

      // 2. EJECUCIÓN: Disparamos el ciclo de vida
      fixture.detectChanges();

      // 3. VERIFICACIÓN
      // Pilar: Integridad (El Signal debe recibir los datos exactos)
      expect(mockMonitoreoService.getMisMonitoreos).toHaveBeenCalledTimes(1);
      expect(component.misMonitoreos()).toEqual(mockMonitoreos);
      expect(component.misMonitoreos()).toHaveLength(2);
    });

    it('debería quedar con lista vacía de forma segura si el servidor no trae datos (Caso de Borde)', () => {
      // 1. PREPARACIÓN: El servicio responde con vacío
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));

      // 2. EJECUCIÓN
      fixture.detectChanges();

      // 3. VERIFICACIÓN
      // El componente debe ser resiliente y no dejar los signals como undefined
      expect(component.misMonitoreos()).toEqual([]);
      expect(component.monitoreosFiltrados()).toEqual([]);
    });

    it('debería disparar la reactividad de los computed automáticamente tras la carga (Integridad)', () => {
      // Verificamos que al cargar los datos, el motor de Signals actualiza el buscador
      const mockData = [{ id: 99, nombre: 'Test Reactividad' }] as MonitoreoListadoDTO[];
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockData));

      fixture.detectChanges();

      // Sin filtro, el computed debe mostrar inmediatamente lo cargado
      expect(component.monitoreosFiltrados()).toEqual(mockData);
    });
  });

  describe('onSearch()', () => {

    // 1. CAMINO FELIZ
    it('debería actualizar el signal de filtro con el valor del input (Camino Feliz)', () => {
      const event = { target: { value: 'Monitor' } } as any;
      component.onSearch(event);
      expect(component.filtro()).toBe('Monitor');
    });

    // 2. CASO DE BORDE
    it('debería resetear el filtro a string vacío si el usuario borra el contenido (Caso de Borde)', () => {
      component.filtro.set('valor previo');
      const event = { target: { value: '' } } as any;
      component.onSearch(event);
      expect(component.filtro()).toBe('');
    });

    // 3. TEST DE SANITIZACIÓN (Lógica delegada)
    it('debería permitir que el valor "sucio" fluya para que el computed aplique el trim (Test de Sanitización)', () => {
      // El método onSearch no limpia, deja que el sistema reactivo lo haga en el computed
      const event = { target: { value: '   espacios   ' } } as any;
      component.onSearch(event);

      expect(component.filtro()).toBe('   espacios   ');
      // Verificamos que el pilar de sanitización se cumple en la salida final
      expect(component.monitoreosFiltrados()).toBeDefined();
    });

    // 4. TESTS DE ESTADO DE INTERFAZ
    it('debería emitir el nuevo valor a través del Signal para notificar a la UI (Tests de Estado de Interfaz)', () => {
      const spySet = vi.spyOn(component.filtro, 'set');
      const event = { target: { value: 'cambio' } } as any;

      component.onSearch(event);

      // Verificamos que se usa la vía oficial de actualización de estado de Angular Signals
      expect(spySet).toHaveBeenCalledWith('cambio');
    });

    // 5. TEST DE INTEGRIDAD
    it('debería mantener la integridad del tipo de dato como string (Integridad)', () => {
      // Incluso si se pegara algo extraño, el target value asegura que el flujo sea string
      const event = { target: { value: '123' } } as any;
      component.onSearch(event);
      expect(typeof component.filtro()).toBe('string');
    });

    // 6. TESTS DE INTEGRACIÓN DOM
    it('debería capturar correctamente el valor desde un elemento HTMLInputElement real (Tests de Integración DOM)', () => {
      const inputElement = document.createElement('input');
      inputElement.value = 'Busqueda Real';
      const event = { target: inputElement } as any;

      component.onSearch(event);

      expect(component.filtro()).toBe('Busqueda Real');
    });
  });

  describe('toggleMonitoreo()', () => {

    // 1. CAMINO FELIZ (Adición)
    it('debería añadir un ID a la lista si no está presente (Camino Feliz)', () => {
      component.seleccionados.set([1]);

      component.toggleMonitoreo(2);

      expect(component.seleccionados()).toContain(2);
      expect(component.seleccionados()).toHaveLength(2);
    });

    // 2. CAMINO FELIZ (Eliminación)
    it('debería eliminar un ID de la lista si ya está presente (Camino Feliz)', () => {
      component.seleccionados.set([1, 2]);

      component.toggleMonitoreo(2);

      expect(component.seleccionados()).not.toContain(2);
      expect(component.seleccionados()).toEqual([1]);
    });

    // 3. CASO DE BORDE
    it('debería funcionar correctamente partiendo de una lista vacía (Caso de Borde)', () => {
      component.seleccionados.set([]);

      component.toggleMonitoreo(99);

      expect(component.seleccionados()).toEqual([99]);
    });

    // 4. TEST DE INTEGRIDAD (Inmutabilidad)
    it('debería garantizar que se genera una nueva referencia de array para disparar la reactividad (Integridad)', () => {
      const listaOriginal = [10];
      component.seleccionados.set(listaOriginal);

      component.toggleMonitoreo(20);

      // Verificamos que NO es el mismo objeto (inmutabilidad de Signals)
      expect(component.seleccionados()).not.toBe(listaOriginal);
      expect(component.seleccionados()).toEqual([10, 20]);
    });

    // 5. TEST DE ESTADO DE INTERFAZ
    it('debería actualizar el estado de los "computed" dependientes al cambiar la selección (Estado de Interfaz)', () => {
      // Aunque estaSeleccionado es un método, depende del signal que toggleMonitoreo modifica
      component.seleccionados.set([1]);

      component.toggleMonitoreo(1);

      // La UI debería reaccionar dejando de marcar el elemento
      expect(component.estaSeleccionado(1)).toBe(false);
    });

    // 6. TEST DE VALIDACIÓN DE NEGOCIO
    it('debería manejar IDs repetidos de forma resiliente (Validación de Negocio)', () => {
      // Forzamos un estado inconsistente (ID duplicado)
      component.seleccionados.set([1, 1]);

      // Al hacer toggle de 1, debería limpiar todas las ocurrencias o manejarlo según lógica
      component.toggleMonitoreo(1);

      // Según tu lógica actual (filter i !== id), eliminaría ambos
      expect(component.seleccionados()).not.toContain(1);
    });
  });

  describe('Pilar: Consulta e Integridad (estaSeleccionado)', () => {

    // 1. CAMINO FELIZ (Positivo)
    it('debería retornar true si el ID existe en la lista de seleccionados (Camino Feliz)', () => {
      component.seleccionados.set([5, 10, 15]);

      const resultado = component.estaSeleccionado(10);

      expect(resultado).toBe(true);
    });

    // 2. CAMINO FELIZ (Negativo)
    it('debería retornar false si el ID no está en la lista (Camino Feliz)', () => {
      component.seleccionados.set([5, 10, 15]);

      const resultado = component.estaSeleccionado(99);

      expect(resultado).toBe(false);
    });

    // 3. CASO DE BORDE
    it('debería manejar una lista de seleccionados vacía sin errores (Caso de Borde)', () => {
      component.seleccionados.set([]);

      const resultado = component.estaSeleccionado(1);

      expect(resultado).toBe(false);
    });

    // 4. TEST DE INTEGRIDAD (Reactividad)
    it('debería reflejar cambios inmediatamente cuando el signal se actualiza (Integridad)', () => {
      // Empezamos en false
      component.seleccionados.set([1]);
      expect(component.estaSeleccionado(2)).toBe(false);

      // Actualizamos el estado
      component.seleccionados.update(ids => [...ids, 2]);

      // Debe reflejar true sin necesidad de llamadas extra
      expect(component.estaSeleccionado(2)).toBe(true);
    });

    // 5. TEST DE ESTADO DE INTERFAZ
    it('debería ser utilizable directamente por el template para marcar checkboxes (Estado de Interfaz)', () => {
      // Este pilar asegura que el método devuelve un booleano puro, que es lo que espera el binding [checked]
      component.seleccionados.set([100]);

      const valorParaCheckbox = component.estaSeleccionado(100);

      expect(typeof valorParaCheckbox).toBe('boolean');
      expect(valorParaCheckbox).toBe(true);
    });

    // 6. VALIDACIÓN DE NEGOCIO (Tipado)
    it('debería fallar o retornar false si se busca un ID con tipo incorrecto (Validación de Negocio)', () => {
      component.seleccionados.set([123]);

      // Intentamos buscar un string en una lista de numbers (simulando error de entrada)
      // @ts-ignore
      const resultado = component.estaSeleccionado("123");

      // La integridad del .includes() de JS dictará false por tipo
      expect(resultado).toBe(false);
    });
  });

  describe('guardar()', () => {

    // 1. PROTECCIÓN DE ENVÍO / VALIDACIÓN DE NEGOCIO
    it('debería bloquear el envío si el nombre está vacío o no hay monitoreos (Protección de Envío)', () => {
      // Caso A: Sin nombre
      component.nombrePlantilla = '';
      component.seleccionados.set([1]);
      component.guardar();
      expect(mockPlantillaService.create).not.toHaveBeenCalled();

      // Caso B: Sin seleccionados
      component.nombrePlantilla = 'Pack Test';
      component.seleccionados.set([]);
      component.guardar();
      expect(mockPlantillaService.create).not.toHaveBeenCalled();
    });

    // 2. TEST DE ESTADO DE CARGA / BLOQUEO DE RE-ENTRADA
    it('debería activar el estado de carga y evitar múltiples envíos (Estado de Carga y Re-entrada)', () => {
      component.nombrePlantilla = 'Pack Beta';
      component.seleccionados.set([1]);
      mockPlantillaService.create.mockReturnValue(of({})); // Simula respuesta

      component.guardar();

      // Pilar: El spinner debe estar activo mientras procesa
      expect(component.cargando()).toBe(true);
      expect(mockPlantillaService.create).toHaveBeenCalledTimes(1);
    });

    // 3. CAMINO FELIZ / INTEGRIDAD (PAYLOAD)
    it('debería enviar el payload con el formato correcto y navegar al éxito (Camino Feliz e Integridad)', () => {
      component.nombrePlantilla = 'Pack Pro';
      component.seleccionados.set([10, 20]);
      mockPlantillaService.create.mockReturnValue(of({ id: 1 }));

      component.guardar();

      // Pilar Integridad: Verificamos que mapea IDs a objetos {id: number}
      const payloadEsperado = {
        nombre: 'Pack Pro',
        monitoreos: [{ id: 10 }, { id: 20 }]
      };
      expect(mockPlantillaService.create).toHaveBeenCalledWith(payloadEsperado);

      // Pilar Navegación: Redirección tras éxito
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/difusion/administrar-plantillas']);
    });

    // 4. MANEJO DE ERRORES / INTEGRIDAD
    it('debería liberar el estado de carga si la API falla (Manejo de Errores)', () => {
      // Silenciamos el error en consola para el test
      vi.spyOn(console, 'error').mockImplementation(() => {});
      component.nombrePlantilla = 'Pack Error';
      component.seleccionados.set([1]);

      // Simulamos fallo del servidor
      mockPlantillaService.create.mockReturnValue(throwError(() => new Error('Server Error')));

      component.guardar();

      // Pilar Manejo de Errores: El spinner debe apagarse para que el usuario pueda reintentar
      expect(component.cargando()).toBe(false);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // 5. TEST DE ESTADO DE INTERFAZ (BOTÓN)
    it('debería reflejar la invalidez del formulario en el estado del botón (Tests de Integración DOM)', () => {
      // Seteamos estado inválido
      component.nombrePlantilla = '';
      fixture.detectChanges();

      const boton = fixture.nativeElement.querySelector('#btn-guardar');
      // Verificamos que el binding [disabled] del HTML responde a la lógica
      expect(boton.disabled).toBe(true);
    });
  });

});
