import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PlantMonitoreoLista} from './plant-monitoreo-lista';
import {PlantillaMonitoreoService} from '../../../services/plantilla-monitoreo.service';
import {of, Subject, throwError} from 'rxjs';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {provideRouter, RouterLink} from '@angular/router';
import {PlantillaMonitoreo} from '../../../models/plantilla-monitoreo';

describe('PlantMonitoreoLista - Fase 1: Infraestructura', () => {
  let component: PlantMonitoreoLista;
  let fixture: ComponentFixture<PlantMonitoreoLista>;

  // --- 1. MOCKS (Pilar: Integridad y Contrato) ---
  const mockPlantillaService = {
    findAll: vi.fn(),
    delete: vi.fn()
  };

  // --- 2. TEMPLATE FUNCIONAL (Pilar 11: Integración DOM) ---
  // Simplificamos el HTML para testear solo lo que importa: IDs de búsqueda y botones
  const functionalTemplate = `
    <div>
      <input [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" id="buscar">

      @if (cargando()) {
        <div id="spinner">Cargando...</div>
      }

      <table>
        @for (p of plantillasFiltradas(); track p.id) {
          <tr class="plantilla-row">
            <td>{{ p.nombre }}</td>
            <td>
              <button (click)="eliminarPlantilla(p.id)" [id]="'btn-delete-' + p.id">Eliminar</button>
            </td>
          </tr>
        } @empty {
          <div id="empty-message">No hay plantillas</div>
        }
      </table>
    </div>
  `;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Respuestas por defecto (Camino Feliz)
    mockPlantillaService.findAll.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      // ELIMINAMOS PlantMonitoreoLista de aquí para que no intente cargar el .html real
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: PlantillaMonitoreoService, useValue: mockPlantillaService },
        provideRouter([]) // Pilar 1: Evita errores de RouterLink
      ]
    })
      // Aquí es donde "inyectamos" nuestra versión ligera sin archivos externos
      .overrideComponent(PlantMonitoreoLista, {
        set: {
          template: functionalTemplate,
          templateUrl: undefined, // Crucial: matamos el enlace al archivo físico
          imports: [CommonModule, FormsModule, RouterLink]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PlantMonitoreoLista);
    component = fixture.componentInstance;

    // No llamamos a detectChanges aquí para controlar nosotros el ngOnInit en los tests de carga
  });

  it('debería instanciar el componente y sus dependencias', () => {
    expect(component).toBeTruthy();
  });

  describe('Injects y Signals', () => {

    describe('Pilar 1: Inyección y Contrato', () => {
      it('debería garantizar la presencia de las dependencias inyectadas', () => {
        // Validamos que el servicio se haya inyectado correctamente vía inject()
        expect(component['plantillaService']).toBeDefined();
      });

      it('debería inicializar con el estado correcto (Pilar: Estado Inicial)', () => {
        expect(component.plantillas()).toEqual([]);
        expect(component.filtro()).toBe('');
        // En este componente, cargando empieza en true por defecto
        expect(component.cargando()).toBe(true);
      });
    });

    describe('Pilar 9: Reactividad de Negocio (PlantillasFiltradas)', () => {

      beforeEach(() => {
        // CORRECCIÓN: Cambiamos 'paginas' por 'monitoreos' para cumplir con la interfaz PlantillaMonitoreo
        const mockPlantillas: PlantillaMonitoreo[] = [
          { id: 1, nombre: 'Monitorización Redes', monitoreos: [] },
          { id: 2, nombre: 'Seguimiento Prensa', monitoreos: [] },
          { id: 3, nombre: 'Alertas Google', monitoreos: [] }
        ];
        component.plantillas.set(mockPlantillas);
      });

      it('debería filtrar plantillas por nombre (insensible a mayúsculas)', () => {
        component.filtro.set('MONITOR');

        expect(component.plantillasFiltradas().length).toBe(1);
        expect(component.plantillasFiltradas()[0].nombre).toBe('Monitorización Redes');
      });

      it('debería ser resiliente a espacios en blanco en el filtro', () => {
        component.filtro.set('  prensa  ');

        expect(component.plantillasFiltradas().length).toBe(1);
        expect(component.plantillasFiltradas()[0].nombre).toBe('Seguimiento Prensa');
      });

      it('debería retornar la lista completa si el filtro está vacío', () => {
        component.filtro.set('');
        expect(component.plantillasFiltradas().length).toBe(3);
      });

      it('debería retornar lista vacía si no hay coincidencias', () => {
        component.filtro.set('ZXC');
        expect(component.plantillasFiltradas().length).toBe(0);
      });
    });
  });

  describe('ngOnInit', () => {

    it('debería cargar las plantillas exitosamente al iniciar', async () => {
      // --- 1. PREPARACIÓN ---
      const mockData: PlantillaMonitoreo[] = [
        { id: 1, nombre: 'Plantilla A', monitoreos: [] },
        { id: 2, nombre: 'Plantilla B', monitoreos: [] }
      ];
      mockPlantillaService.findAll.mockReturnValue(of(mockData));

      // --- 2. EJECUCIÓN ---
      // Trigger ngOnInit
      fixture.detectChanges();

      // Como cargarPlantillas es async, esperamos a que se resuelvan las promesas internas
      await fixture.whenStable();
      // Pequeño respiro para que el bloque 'finally' se ejecute en la cola de microtareas
      await Promise.resolve();

      // --- 3. VERIFICACIÓN ---
      expect(component.plantillas().length).toBe(2);
      expect(component.plantillas()).toEqual(mockData);
      expect(component.cargando()).toBe(false); // Pilar 5: El spinner se apaga
    });

    it('debería gestionar errores de la API con resiliencia (Pilar 4)', async () => {
      // --- 1. PREPARACIÓN ---
      // Silenciamos el console.error para no ensuciar la salida del test
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPlantillaService.findAll.mockReturnValue(throwError(() => new Error('Error de servidor')));

      // --- 2. EJECUCIÓN ---
      // Llamamos directamente al método para controlar el await fácilmente
      await component.cargarPlantillas();

      // --- 3. VERIFICACIÓN ---
      expect(component.cargando()).toBe(false); // Pilar 5: El spinner se apaga siempre
      expect(component.plantillas()).toEqual([]); // Pilar 10: Estado íntegro (vaciado o inicial)
      expect(console.error).toHaveBeenCalledWith("Error al cargar plantillas", expect.any(Error));
    });

  });

  describe('cargarPlantillas()', () => {

    it('debería manejar el flujo de estados (cargando) correctamente', async () => {
      // 1. PREPARACIÓN: Usamos un Subject para controlar el tiempo de respuesta
      const dataSubject = new Subject<PlantillaMonitoreo[]>();
      mockPlantillaService.findAll.mockReturnValue(dataSubject.asObservable());

      // 2. EJECUCIÓN
      const pCarga = component.cargarPlantillas();

      // Verificamos estado intermedio (Pilar 5/6)
      expect(component.cargando()).toBe(true);

      // Resolvemos el observable
      dataSubject.next([{ id: 1, nombre: 'Test', monitoreos: [] }]);
      dataSubject.complete();

      await pCarga;

      // 3. VERIFICACIÓN FINAL
      expect(component.cargando()).toBe(false);
      expect(component.plantillas().length).toBe(1);
    });

    it('debería asegurar que la lista de plantillas sea un array vacío si la API devuelve null (Pilar 10: Integridad)', async () => {
      // Simulamos que el backend responde con éxito pero sin cuerpo (null)
      mockPlantillaService.findAll.mockReturnValue(of(null as any));

      await component.cargarPlantillas();

      // Evitamos errores de "cannot read property map of null" en el template
      expect(component.plantillas()).toEqual([]);
    });

  });

  describe('Método: eliminarPlantilla() (Pilares 6, 8 y 10)', () => {

    it('no debería llamar al servicio si el usuario cancela el diálogo (Pilar 8: Sanitización)', async () => {
      // 1. PREPARACIÓN: Simulamos que el usuario pulsa "Cancelar"
      const spyConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const spyDelete = vi.spyOn(mockPlantillaService, 'delete');

      // 2. EJECUCIÓN
      await component.eliminarPlantilla(1);

      // 3. VERIFICACIÓN
      expect(spyConfirm).toHaveBeenCalled();
      expect(spyDelete).not.toHaveBeenCalled();
    });

    it('debería eliminar de la lista local si el usuario confirma (Pilar 10: Integridad Local)', async () => {
      // 1. PREPARACIÓN
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockPlantillaService.delete.mockReturnValue(of({}));

      // Seteamos un estado inicial con la plantilla que vamos a borrar
      const inicial = [{ id: 99, nombre: 'A borrar', monitoreos: [] }];
      component.plantillas.set(inicial);

      // 2. EJECUCIÓN
      await component.eliminarPlantilla(99);

      // 3. VERIFICACIÓN
      // Pilar 7: Verificamos que se llamó a la API con el ID correcto
      expect(mockPlantillaService.delete).toHaveBeenCalledWith(99);

      // Pilar 10: Verificamos que el Signal se ha actualizado correctamente (ya no está el 99)
      expect(component.plantillas().length).toBe(0);
      expect(component.plantillas().find(p => p.id === 99)).toBeUndefined();
    });

    it('debería apagar el spinner incluso si el borrado falla (Pilar 4: Resiliencia)', async () => {
      // 1. PREPARACIÓN
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPlantillaService.delete.mockReturnValue(throwError(() => new Error('Fail')));

      // 2. EJECUCIÓN
      await component.eliminarPlantilla(1);

      // 3. VERIFICACIÓN
      // Pilar 5: El estado de carga debe liberarse para no bloquear la UI
      expect(component.cargando()).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

});
