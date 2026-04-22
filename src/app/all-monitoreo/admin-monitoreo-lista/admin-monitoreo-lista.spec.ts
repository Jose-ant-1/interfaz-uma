import { TestBed } from '@angular/core/testing';
import { AdminMonitoreoListaComponent } from './admin-monitoreo-lista';
import { MonitoreoService } from '../../services/monitoreo.service';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {MonitoreoListadoDTO} from '../../models/monitoreo.model';

describe('AdminMonitoreoListaComponent - Test de Robustez', () => {
  let component: AdminMonitoreoListaComponent;

  const mockMonitoreoService = {
    obtenerTodosLosMonitoreos: vi.fn()
  };

  const mockDatos: MonitoreoListadoDTO[] = [
    {
      id: 1,
      nombre: 'Producción Servidor',
      paginaUrl: 'https://prod.com',
      propietarioId: 100,
      ultimoEstado: 200,
      fechaUltimaRevision: new Date().toISOString(),
      activo: true
    },
    {
      id: 2,
      nombre: 'Staging Web',
      paginaUrl: 'https://stg.es',
      propietarioId: 101,
      ultimoEstado: 500,
      fechaUltimaRevision: new Date().toISOString(),
      activo: true
    }
  ];
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MonitoreoService, useValue: mockMonitoreoService }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    runInInjectionContext(injector, () => {
      component = new AdminMonitoreoListaComponent();
    });

    vi.clearAllMocks();
  });

  describe('inject', () => {
    it('debería inyectar correctamente el MonitoreoService', () => {
      expect(component['monitoreoService']).toBeDefined();
    });
  });

  describe('Signals', () => {
    it('debería iniciar con la lista de monitoreos vacía', () => {
      expect(component.monitoreos()).toEqual([]);
    });

    it('debería iniciar con el término de búsqueda vacío', () => {
      expect(component.searchTerm()).toBe('');
    });

    it('debería tener una lista filtrada inicial vacía', () => {
      expect(component.monitoreosFiltrados()).toEqual([]);
    });
  });

  describe('ngOnInit()', () => {
    it('debería cargar los monitoreos correctamente desde el servicio', () => {
      mockMonitoreoService.obtenerTodosLosMonitoreos.mockReturnValue(of(mockDatos));

      component.ngOnInit();

      expect(component.monitoreos()).toEqual(mockDatos);
    });

    it('debería manejar errores de red de forma resiliente', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockMonitoreoService.obtenerTodosLosMonitoreos.mockReturnValue(throwError(() => 'Error API'));

      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.monitoreos()).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('Computed', () => {
    beforeEach(() => {
      // Seteamos un estado base para los tests de filtrado
      component.monitoreos.set(mockDatos);
    });

    it('debería filtrar por nombre ignorando mayúsculas', () => {
      component.searchTerm.set('PRODUCCIÓN');
      const resultado = component.monitoreosFiltrados();

      expect(resultado.length).toBe(1);
      expect(resultado[0].nombre).toBe('Producción Servidor');
    });

    it('debería filtrar por URL', () => {
      component.searchTerm.set('.es');
      expect(component.monitoreosFiltrados().length).toBe(1);
    });

    it('debería aplicar trim() al término de búsqueda para evitar errores de espacios', () => {
      component.searchTerm.set('   prod   ');
      expect(component.monitoreosFiltrados().length).toBe(1);
    });

    it('debería devolver todos los elementos si el buscador está vacío', () => {
      component.searchTerm.set('');
      expect(component.monitoreosFiltrados().length).toBe(2);
    });

    it('debería devolver un array vacío si no hay coincidencias', () => {
      component.searchTerm.set('NombreInexistente');
      expect(component.monitoreosFiltrados()).toEqual([]);
    });
  });
});
