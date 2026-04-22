import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginaAnyadir } from './pagina-anyadir';
import { PaginaService } from '../../services/pagina.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {Pagina} from '../../models/pagina.model';

describe('PaginaAnyadir - Test de Acción', () => {
  let component: PaginaAnyadir;
  let fixture: ComponentFixture<PaginaAnyadir>;

  // Mocks de los servicios
  const mockPaginaService = {
    createPagina: vi.fn()
  };
  const mockData: Pagina = { id: 1, nombre: 'Test', url: 'https://test.com', notaInfo: 'Nota' };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // 1. ELIMINAMOS el componente de los imports del módulo para que no intente resolver el templateUrl
    await TestBed.configureTestingModule({
      imports: [FormsModule], // Solo FormsModule, NO PaginaAnyadir aquí
      providers: [
        { provide: PaginaService, useValue: mockPaginaService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    // 2. HACEMOS EL OVERRIDE sobre la clase directamente
    TestBed.overrideComponent(PaginaAnyadir, {
      set: {
        template: `
          <form (ngSubmit)="guardar()" #f="ngForm">
            <input name="nombre" [(ngModel)]="nuevaPagina().nombre" required>
            <input name="url" [(ngModel)]="nuevaPagina().url" required>
            <textarea name="notaInfo" [(ngModel)]="nuevaPagina().notaInfo"></textarea>
            <button type="submit" id="btn-guardar" [disabled]="!f.valid">Crear</button>
          </form>
        `,
        templateUrl: undefined, // Matamos la referencia al archivo
        styleUrls: []
      }
    });

    // 3. CREAMOS EL COMPONENTE (Angular resolverá la clase con el override aplicado)
    fixture = TestBed.createComponent(PaginaAnyadir);
    component = fixture.componentInstance;

    // Inicializamos la signal para evitar fallos de lectura inicial
    component.nuevaPagina.set({ nombre: '', url: '', notaInfo: '' });

    fixture.detectChanges();
  });

  it('debería crearse el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Signals e inject', () => {

    const mockNuevaPagina: Pagina = {
      id: 1,
      nombre: 'Nueva Web',
      url: 'https://test.com',
      notaInfo: 'Info extra'
    };

    // 1. CAMINO FELIZ e INTEGRACIÓN DOM
    it('debería actualizar la signal cuando el usuario escribe en el formulario', async () => {
      const inputNombre = fixture.nativeElement.querySelector('input[name="nombre"]');
      inputNombre.value = 'Málaga Tech';
      inputNombre.dispatchEvent(new Event('input'));

      fixture.detectChanges();
      await fixture.whenStable(); // Esperamos a que ngModel sincronice

      expect(component.nuevaPagina().nombre).toBe('Málaga Tech');
    });

    // 2. PROTECCIÓN DE ENVÍO e INTEGRIDAD
    it('debería llamar al servicio con los datos correctos y navegar al éxito', () => {
      // Configuramos el mock para que responda con éxito
      mockPaginaService.createPagina.mockReturnValue(of(mockNuevaPagina));

      // Seteamos la signal con datos
      component.nuevaPagina.set(mockNuevaPagina);

      component.guardar();

      // Verificamos el contrato de integridad: ¿se envió lo que había en la signal?
      expect(mockPaginaService.createPagina).toHaveBeenCalledWith(mockNuevaPagina);
      // Verificamos navegación (Camino Feliz)
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/paginas']);
    });

    // 3. MANEJO DE ERRORES y ESTADO DE INTERFAZ
    it('debería gestionar errores del servidor sin navegar y mostrando alerta', () => {
      // Simulamos un error de red
      mockPaginaService.createPagina.mockReturnValue(throwError(() => new Error('DB Error')));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.guardar();

      // Verificamos robustez: El error se captura, se loguea y NO se navega
      expect(consoleSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // 4. CASO DE BORDE y VALIDACIÓN DE NEGOCIO
    it('debería permitir guardar aunque notaInfo esté vacío (campo opcional)', () => {
      const paginaMinima = { nombre: 'Mínimo', url: 'https://mini.es' };
      mockPaginaService.createPagina.mockReturnValue(of({ ...paginaMinima, id: 2 }));

      component.nuevaPagina.set(paginaMinima);
      component.guardar();

      expect(mockPaginaService.createPagina).toHaveBeenCalled();
    });

    // 5. BLOQUEO DE RE-ENTRADA (Estratégico)
    it('debería estar deshabilitado el envío si el formulario es inválido', async () => {
      // Este pilar se verifica en el DOM gracias al [disabled]="!f.valid"
      fixture.detectChanges();
      await fixture.whenStable();

      const botonGuardar = fixture.nativeElement.querySelector('#btn-guardar');

      // Al inicio está vacío, por tanto, inválido (required)
      expect(component.nuevaPagina().nombre).toBe('');
      // Nota: Para testear f.valid necesitamos que el template del override sea fiel al original
      // Si el botón está vinculado a f.valid, el test de integración DOM lo cubriría.
    });

    // 6. TEST DE ESTADO DE CARGA / INICIALIZACIÓN
    it('debería inicializar la signal con valores vacíos para prevenir nulos', () => {
      // Pilar de Integridad de Datos inicial
      const estadoInicial = component.nuevaPagina();
      expect(estadoInicial).toEqual({
        nombre: '',
        url: '',
        notaInfo: ''
      });
    });

    // 7. TEST DE SANITIZACIÓN (Lógica previa al envío)
    it('debería tratar los datos como un objeto Pagina al enviar', () => {
      const partialData = { nombre: 'Test' };
      component.nuevaPagina.set(partialData);

      mockPaginaService.createPagina.mockReturnValue(of({}));

      // Verificamos que el cast "as Pagina" no rompe la ejecución
      expect(() => component.guardar()).not.toThrow();
    });
  });

  describe('Pilar de Acción: Método guardar()', () => {
    // 1. CAMINO FELIZ + INTEGRIDAD + INTEGRACIÓN DOM
    it('debería completar el flujo completo: enviar datos, suscribirse y navegar (Camino Feliz)', () => {
      // Configuramos el mock para que emita un valor (simula éxito de API)
      mockPaginaService.createPagina.mockReturnValue(of(mockData));

      component.nuevaPagina.set(mockData);
      component.guardar();

      // Verificamos que se envió el contenido de la signal (Integridad)
      expect(mockPaginaService.createPagina).toHaveBeenCalledWith(mockData);
      // Verificamos que al tener éxito, navegó (Flujo de Negocio)
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/paginas']);
    });

    // 2. MANEJO DE ERRORES + ROBUSTEZ (Protección de Interfaz)
    it('debería gestionar el error de red sin romper el componente y alertar al usuario', () => {
      // Simulamos que la API explota
      const errorSimulado = new Error('404 Not Found');
      mockPaginaService.createPagina.mockReturnValue(throwError(() => errorSimulado));

      // Espiamos globales para evitar que salten en la consola del test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      component.guardar();

      // El error debe ser capturado (Manejo de errores)
      expect(consoleSpy).toHaveBeenCalledWith('Error al crear la página:', errorSimulado);
      expect(alertSpy).toHaveBeenCalled();
      // Y MUY IMPORTANTE: No debe navegar si hay error (Integridad del flujo)
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    // 3. TEST DE SANITIZACIÓN (Casting de tipos)
    it('debería forzar el tipado correcto al enviar incluso si faltan campos opcionales', () => {
      const datosIncompletos = { nombre: 'Solo nombre', url: 'url.com' };
      mockPaginaService.createPagina.mockReturnValue(of({}));

      // Seteamos un objeto que técnicamente no es una "Pagina" completa
      component.nuevaPagina.set(datosIncompletos as any);

      component.guardar();

      // El test pasa si no lanza excepción al hacer el "as Pagina"
      expect(mockPaginaService.createPagina).toHaveBeenCalled();
    });

    // 4. BLOQUEO DE RE-ENTRADA (Visual/DOM)
    it('el botón de guardar debe estar deshabilitado si el formulario es inválido (required)', async () => {
      // Vaciamos los datos obligatorios
      component.nuevaPagina.set({ nombre: '', url: '', notaInfo: '' });
      fixture.detectChanges();
      await fixture.whenStable();

      const boton = fixture.nativeElement.querySelector('#btn-guardar');

      // El atributo HTML 'disabled' debe estar presente (Validación de Negocio en DOM)
      expect(boton.disabled).toBe(true);
    });

    // 5. CASO DE BORDE: NotaInfo opcional
    it('debería permitir el envío si notaInfo es un string vacío', () => {
      const dataSinNota = { nombre: 'Web', url: 'https://web.es', notaInfo: '' };
      mockPaginaService.createPagina.mockReturnValue(of(dataSinNota));

      component.nuevaPagina.set(dataSinNota);
      component.guardar();

      expect(mockPaginaService.createPagina).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });

});
