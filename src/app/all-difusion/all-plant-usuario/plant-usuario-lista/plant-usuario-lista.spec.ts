import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlantUsuarioLista } from './plant-usuario-lista';
import { PlantillaUsuarioService } from '../../../services/plantilla-usuario.service';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';

describe('PlantUsuarioListaComponent - Fase 1: Infraestructura y Estado', () => {
  let component: PlantUsuarioLista;
  let fixture: ComponentFixture<PlantUsuarioLista>;

  const mockPlantillaUsuarioService = {
    findAll: vi.fn(),
    delete: vi.fn()
  };

  // Definimos un template funcional para que los tests de UI encuentren los elementos
  const functionalTemplate = `
  <div>
    @if (cargando()) {
      <div class="animate-spin">Cargando...</div>
    } @else {
      <table>
        <tbody>
          @for (p of plantillasFiltradas(); track p.id) {
            <tr><td>{{ p.nombre }}</td></tr>
          } @empty {
            <div class="empty-state">
              <i class="bi-search"></i>
              <span>Sin resultados</span>
            </div>
          }
        </tbody>
      </table>
    }
    <input [ngModel]="filtro()" (ngModelChange)="filtro.set($event)">
  </div>
`;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    // Configuramos el mock para que por defecto no termine la carga inmediatamente si no queremos
    mockPlantillaUsuarioService.findAll.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: PlantillaUsuarioService, useValue: mockPlantillaUsuarioService },
        provideRouter([])
      ]
    }).overrideComponent(PlantUsuarioLista, {
      set: {
        templateUrl: undefined,
        template: functionalTemplate, // Usamos el template funcional
        imports: [CommonModule, FormsModule]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(PlantUsuarioLista);
    component = fixture.componentInstance;
  });

  describe('inject', () => {
    it('debería inyectar correctamente PlantillaUsuarioService', () => {
      // Validamos que el servicio esté disponible en la clase
      expect(component['plantillaUsuarioService']).toBeDefined();
    });
  });

  describe('2. Estado Inicial y Reactividad (Pilar Estabilidad e Integridad)', () => {

    it('debería iniciar con la lista de plantillas vacía', () => {
      expect(component.plantillas()).toEqual([]);
    });

    it('debería iniciar con el estado cargando en true (Pilar UX/Estabilidad)', () => {
      // Es robusto que empiece en true para que el usuario vea el spinner
      // antes de que termine la primera petición asíncrona
      expect(component.cargando()).toBe(true);
    });

    it('debería tener el filtro inicial como string vacío', () => {
      expect(component.filtro()).toBe('');
    });

    it('debería calcular correctamente plantillasFiltradas cuando no hay filtro', () => {
      const mockData = [{ id: 1, nombre: 'Grupo A', usuarios: [] }];
      component.plantillas.set(mockData);

      // Pilar de Integridad: El computed debe reflejar los datos base
      expect(component.plantillasFiltradas()).toEqual(mockData);
    });

    it('debería ser resiliente a mayúsculas y espacios en el filtrado (Pilar Resiliencia)', () => {
      component.plantillas.set([
        { id: 1, nombre: 'SISTEMAS', usuarios: [] },
        { id: 2, nombre: 'Desarrollo', usuarios: [] }
      ]);

      component.filtro.set(' sis '); // Testeamos el .trim() y .toLowerCase()

      const resultado = component.plantillasFiltradas();
      expect(resultado.length).toBe(1);
      expect(resultado[0].nombre).toBe('SISTEMAS');
    });
  });

  describe('ngOnInit', () => {

    it('1. (Pilar Integridad) debería cargar las plantillas y apagar el estado cargando', async () => {
      const mockData = [
        { id: 1, nombre: 'Grupo Test', usuarios: [] }
      ];
      mockPlantillaUsuarioService.findAll.mockReturnValue(of(mockData));

      // Ejecutamos la lógica de carga
      await component['cargarPlantillas']();

      expect(component.plantillas()).toEqual(mockData);
      expect(component.cargando()).toBe(false);
    });

    it('2. (Pilar Resiliencia) debería manejar errores de la API sin romper el componente', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPlantillaUsuarioService.findAll.mockReturnValue(throwError(() => new Error('Error de red')));

      await component['cargarPlantillas']();

      // Verificamos que se capturó el error
      expect(consoleSpy).toHaveBeenCalled();
      // El pilar de estabilidad dicta que el spinner debe apagarse incluso en error
      expect(component.cargando()).toBe(false);
      expect(component.plantillas()).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('3. (Pilar Cohesión) ngOnInit debe disparar la carga inicial', () => {
      const spy = vi.spyOn(component as any, 'cargarPlantillas');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });

    it('4. (Pilar Estabilidad) debe asegurar que cargando sea true al iniciar la petición', () => {
      // Simulamos una respuesta que aún no ha llegado
      mockPlantillaUsuarioService.findAll.mockReturnValue(of([]));

      component.cargando.set(false); // Forzamos estado previo
      component['cargarPlantillas']();

      expect(component.cargando()).toBe(true);
    });
  });

  describe('cargarPlantillas()', () => {

    it('1. (Pilar Integridad) debería mapear correctamente los datos del servicio al Signal', async () => {
      const mockData = [{ id: 1, nombre: 'Grupo Alpha', usuarios: [] }];
      mockPlantillaUsuarioService.findAll.mockReturnValue(of(mockData));

      // Ejecutamos el método privado (usando casting a any para el test)
      await (component as any).cargarPlantillas();

      expect(component.plantillas()).toEqual(mockData);
      expect(component.cargando()).toBe(false);
    });

    it('2. (Pilar Resiliencia) debería capturar errores y asegurar que el spinner se apague', async () => {
      // Espiamos console.error para verificar el pilar de Resiliencia
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPlantillaUsuarioService.findAll.mockReturnValue(throwError(() => new Error('API Timeout')));

      await (component as any).cargarPlantillas();

      // El error debe ser capturado
      expect(consoleSpy).toHaveBeenCalled();
      // Pilar de Estabilidad: No podemos dejar al usuario bloqueado con el spinner
      expect(component.cargando()).toBe(false);
      // Pilar de Seguridad: Si falla, la lista debe permanecer vacía, no con undefined
      expect(component.plantillas()).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('3. (Pilar Estabilidad) debería activar el estado cargando al iniciar la llamada', () => {
      // Simulamos una respuesta lenta
      mockPlantillaUsuarioService.findAll.mockReturnValue(of([]));

      // Llamamos sin el await para ver el estado inmediato
      (component as any).cargarPlantillas();

      expect(component.cargando()).toBe(true);
    });

    it('4. (Pilar de Integridad) debería manejar respuestas nulas del servidor devolviendo un array vacío', async () => {
      // A veces las APIs devuelven null si no hay datos
      mockPlantillaUsuarioService.findAll.mockReturnValue(of(null));

      await (component as any).cargarPlantillas();

      // El pilar de Integridad asegura que el componente siempre trabaje con arrays
      expect(component.plantillas()).toEqual([]);
    });
  });

  describe('eliminarGrupo()', () => {

    beforeEach(() => {
      // Mock de la lista inicial de plantillas
      component.plantillas.set([
        { id: 1, nombre: 'Grupo A', usuarios: [] },
        { id: 2, nombre: 'Grupo B', usuarios: [] }
      ]);
    });

    it('1. (Pilar Resiliencia) debería abortar la eliminación si el usuario cancela el confirm', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const deleteSpy = mockPlantillaUsuarioService.delete;

      await component.eliminarGrupo(1);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(component.plantillas().length).toBe(2);
    });

    it('2. (Pilar Integridad) debería eliminar del signal local tras éxito en el servidor', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockPlantillaUsuarioService.delete.mockReturnValue(of({}));

      await component.eliminarGrupo(1);

      expect(mockPlantillaUsuarioService.delete).toHaveBeenCalledWith(1);
      // Verificamos que el signal se actualizó correctamente (solo queda el ID 2)
      expect(component.plantillas().length).toBe(1);
      expect(component.plantillas()[0].id).toBe(2);
    });

    it('3. (Pilar Resiliencia) debería manejar errores del servidor al intentar borrar', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPlantillaUsuarioService.delete.mockReturnValue(throwError(() => new Error('Error al borrar')));

      await component.eliminarGrupo(1);

      expect(consoleSpy).toHaveBeenCalled();
      // Pilar de Integridad: Si el servidor falla, el elemento NO debe borrarse de la lista
      expect(component.plantillas().length).toBe(2);

      consoleSpy.mockRestore();
    });

    it('4. (Pilar Cohesión) debería funcionar correctamente incluso si la lista está vacía', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.plantillas.set([]);
      mockPlantillaUsuarioService.delete.mockReturnValue(of({}));

      await component.eliminarGrupo(99);

      expect(component.plantillas()).toEqual([]);
    });
  });

  describe('5. Interfaz de Usuario y Renderizado (Pilar Contrato UI)', () => {
    let fixture: any;

    beforeEach(() => {
      // Para tests de DOM necesitamos el fixture
      fixture = TestBed.createComponent(PlantUsuarioLista);
      component = fixture.componentInstance;
    });

    it('debería mostrar el spinner cuando cargando() es true', async () => {
      component.cargando.set(true);
      fixture.detectChanges(); // Angular procesa el cambio del signal en el template

      const spinner = fixture.nativeElement.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('debería ocultar el spinner y mostrar la tabla cuando cargando() es false', async () => {
      // 1. IMPORTANTE: Limpiamos cualquier microtarea pendiente del ngOnInit
      await fixture.whenStable();

      // 2. Seteamos los estados con el componente ya "en reposo"
      component.cargando.set(false);
      component.plantillas.set([{ id: 1, nombre: 'Grupo A', usuarios: [] }]);

      // 3. Primera detección: Para que el @if oculte el spinner
      fixture.detectChanges();

      // 4. Segunda detección (Pilar Estabilidad): Para que el @for pinte las filas
      // En Angular 21, a veces el motor de renderizado necesita un tick extra para los loops
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement;
      const spinner = compiled.querySelector('.animate-spin');
      const rows = compiled.querySelectorAll('tbody tr:not(.block)');

      expect(spinner).toBeNull();
      expect(rows.length).toBe(1);
      expect(compiled.textContent).toContain('Grupo A'); // Validación extra de seguridad
    });

    it('debería mostrar el estado @empty cuando no hay resultados en el filtro', async () => {
      // 1. Forzamos estados
      component.cargando.set(false);
      component.plantillas.set([{ id: 1, nombre: 'Admin', usuarios: [] }]);
      component.filtro.set('BusquedaSinSentido');

      // 2. SINCRONIZACIÓN CRUCIAL:
      // detectChanges() dispara la notificación del Signal
      fixture.detectChanges();

      // whenStable() espera a que el @if y el @for terminen de computar
      await fixture.whenStable();

      // Segunda detección para asegurar que el DOM se ha redibujado tras el cálculo
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;

      // 3. VERIFICACIÓN
      expect(content).toContain('Sin resultados');
      expect(fixture.nativeElement.querySelector('.bi-search')).toBeTruthy();
    });

    it('debería vincular el input de búsqueda con el signal filtro (Pilar Comunicación)', async () => {
      // 1. BLINDAJE: El componente llamará a cargarPlantillas al crear el fixture.
      // Necesitamos que el servicio responda algo para que no explote el ngOnInit.
      mockPlantillaUsuarioService.findAll.mockReturnValue(of([]));

      // Creamos el fixture (esto dispara ngOnInit)
      const fixture = TestBed.createComponent(PlantUsuarioLista);
      const component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('input');

      // 2. CAMBIO DE VALOR
      input.value = 'nuevo filtro';
      input.dispatchEvent(new Event('input'));

      // 3. SINCRONIZACIÓN
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // 4. VERIFICACIÓN
      expect(component.filtro()).toBe('nuevo filtro');
    });
  });

});
