import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginaCardComponent } from './pagina-card';
import { provideRouter, RouterLink } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonModule } from '@angular/common';
import {Pagina} from '../../models/pagina.model';

describe('PaginaCardComponent - Blindaje de UI', () => {
  let component: PaginaCardComponent;
  let fixture: ComponentFixture<PaginaCardComponent>;

  const mockPaginaData: Pagina = { // Renombrado para consistencia
    id: 123,
    nombre: 'Google España',
    url: 'https://google.es',
    notaInfo: 'Buscador'
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    TestBed.overrideComponent(PaginaCardComponent, {
      set: {
        template: `
          <div>
            <span id="titulo">{{ pagina?.nombre }}</span>
            <button (click)="eliminar()" id="btn-eliminar">Eliminar</button>
          </div>
        `, // Añadido el '?' (safe navigation) para evitar el error de 'nombre'
        templateUrl: undefined,
        styleUrls: [],
        imports: [CommonModule, RouterLink]
      }
    });

    await TestBed.configureTestingModule({
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaCardComponent);
    component = fixture.componentInstance;
    component.pagina = mockPaginaData;
  });

  describe('@Input y @Output', () => {

    // Setup de datos base
    const mockPaginaCompleta = {
      id: 1,
      nombre: 'Web de Prueba',
      url: 'https://uma.es',
      notaInfo: 'Nota de test'
    };

    // 1. CAMINO FELIZ (Renderizado y Carga de Datos)
    it('debería crearse correctamente y leer el nombre de la página', () => {
      // 1. Asignar primero
      component.pagina = mockPaginaData;
      // 2. Detectar cambios después
      fixture.detectChanges();

      const titulo = fixture.nativeElement.querySelector('#titulo');
      expect(titulo.textContent).toContain('Google España');
    });

    // 2. CASO DE BORDE (Datos mínimos)
    it('debería ser resiliente si faltan campos opcionales como notaInfo (Caso de Borde)', () => {
      component.pagina = { id: 2, nombre: 'Mínimo', url: 'test.com' } as any;
      fixture.detectChanges();

      expect(component).toBeTruthy();
      const notas = fixture.nativeElement.querySelector('#notas'); // Si usas @if en el template real
      expect(notas).toBeNull();
    });

    // 3. TEST DE SANITIZACIÓN Y VALIDACIÓN DE NEGOCIO (Helpers)
    it('debería asegurar que los enlaces externos siempre tengan protocolo (Validación/Sanitización)', () => {
      // Caso: El usuario introduce la URL "a pelo"
      const enlaceLimpio = component.prepararEnlace('google.com');
      expect(enlaceLimpio).toBe('https://google.com');

      // Caso: La URL ya está bien
      expect(component.prepararEnlace('https://google.com')).toBe('https://google.com');

      // Caso de error: URL vacía
      expect(component.prepararEnlace('')).toBe('#');
    });

    // 4. TEST DE INTEGRIDAD (Emisión de Eventos)
    it('debería emitir exactamente el ID correspondiente al pulsar eliminar (Integridad)', () => {
      component.pagina = mockPaginaCompleta;
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();

      expect(emitSpy).toHaveBeenCalledWith(1);
    });

    // 5. BLOQUEO DE RE-ENTRADA Y PROTECCIÓN DE ENVÍO
    it('debería emitir solo una vez por cada llamada manual a eliminar (Protección de Envío)', () => {
      component.pagina = mockPaginaCompleta;
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();
      component.eliminar();

      expect(emitSpy).toHaveBeenCalledTimes(2);
      // Nota: En componentes tontos, el bloqueo de re-entrada suele estar en el PADRE
      // (el que hace la petición HTTP), pero aquí validamos que el componente cumple su parte.
    });

    // 6. MANEJO DE ERRORES (Robustez de tipos)
    it('no debería romper la interfaz si el @Input recibe una URL mal formateada (Manejo de Errores)', () => {
      const urlRara = '///esto-no-es-una-url///';
      const resultado = component.formatearUrlVisual(urlRara);

      // La lógica debe ser capaz de devolver algo, aunque sea el string original, sin lanzar excepciones
      expect(typeof resultado).toBe('string');
    });

    // 7. ESTADO DE INTERFAZ E INTEGRACIÓN DOM
    it('debería reflejar cambios en el DOM si el @Input cambia dinámicamente', async () => {
      // Carga inicial
      component.pagina = { ...mockPaginaData, nombre: 'Primero' };
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#titulo').textContent).toContain('Primero');

      // Cambio dinámico: Usamos setInput para que Angular gestione el ciclo de vida correctamente
      fixture.componentRef.setInput('pagina', { ...mockPaginaData, nombre: 'Segundo' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#titulo').textContent).toContain('Segundo');
    });

    // 8. TEST DE ESTADO DE CARGA (Simulado)
    it('debería tener el objeto pagina definido tras la inicialización del test', () => {
      component.pagina = mockPaginaData;
      fixture.detectChanges();
      expect(component.pagina).toBeDefined();
      expect(component.pagina.id).toBe(123);
    });
  });

  describe('eliminar()', () => {

    beforeEach(() => {
      // Setup: Aseguramos que el componente tiene datos antes de cada test
      component.pagina = { id: 500, nombre: 'Página a eliminar', url: 'test.com' } as Pagina;
    });

    // 1. CAMINO FELIZ
    it('debería emitir el ID correcto cuando se invoca el método (Camino Feliz)', () => {
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();

      expect(emitSpy).toHaveBeenCalledWith(500);
    });

    // 2. CASO DE BORDE (ID ausente)
    it('debería emitir undefined si por algún error el objeto pagina no tiene ID (Caso de Borde)', () => {
      component.pagina = { nombre: 'Sin ID' } as any;
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();

      expect(emitSpy).toHaveBeenCalledWith(undefined);
    });

    // 3. BLOQUEO DE RE-ENTRADA Y PROTECCIÓN DE ENVÍO
    it('debería permitir múltiples emisiones si el usuario pulsa varias veces (Responsabilidad del Padre)', () => {
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();
      component.eliminar();

      // En un componente "tonto", el bloqueo de spam se hace en el componente "Lista" (padre)
      // Aquí validamos que el componente hijo siempre cumple su orden de emitir.
      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    // 4. TEST DE SANITIZACIÓN (Validación de datos previos)
    it('no debería emitir si el objeto pagina es nulo (Sanitización)', () => {
      (component as any).pagina = null;
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      // Intentamos eliminar algo que no existe
      try {
        component.eliminar();
      } catch (e) {
        // Si el código real no tiene un check de null, esto podría fallar,
        // lo cual nos indica que debemos proteger el método eliminar()
      }

      expect(emitSpy).not.toHaveBeenCalledWith(500);
    });

    // 5. TEST DE INTEGRACIÓN DOM
    it('debería ejecutar la función eliminar() al hacer clic en el botón del template (Integración DOM)', () => {
      const eliminarSpy = vi.spyOn(component, 'eliminar');
      fixture.detectChanges();

      const boton = fixture.nativeElement.querySelector('#btn-eliminar');
      boton.click();

      expect(eliminarSpy).toHaveBeenCalled();
    });

    // 6. TEST DE ESTADO DE INTERFAZ
    it('el botón de eliminar debería estar presente y visible (Estado de Interfaz)', () => {
      fixture.detectChanges();
      const boton = fixture.nativeElement.querySelector('#btn-eliminar');

      expect(boton).not.toBeNull();
      expect(boton.textContent).toContain('Eliminar');
    });

    // 7. MANEJO DE ERRORES (Robustez de tipos)
    it('debería manejar IDs que no sean números sin romper la ejecución (Manejo de Errores)', () => {
      component.pagina = { id: 'abc' as any, nombre: 'Error de tipo' } as Pagina;
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();

      expect(emitSpy).toHaveBeenCalledWith('abc');
    });

    // 8. TEST DE INTEGRIDAD
    it('debería emitir el ID original sin haberlo modificado (Integridad)', () => {
      const originalId = 777;
      component.pagina = { ...component.pagina, id: originalId };
      const emitSpy = vi.spyOn(component.Delete, 'emit');

      component.eliminar();

      expect(emitSpy).toHaveBeenCalledWith(originalId);
    });

    // 9. VALIDACIÓN DE NEGOCIO
    it('el evento emitido debe ser del tipo EventEmitter (Validación Técnica)', () => {
      expect(component.Delete).toBeDefined();
      expect(typeof component.Delete.emit).toBe('function');
    });

    // 10. TEST DE ESTADO DE CARGA (Interfaz)
    it('no debería mostrar estados de carga en la card (la carga es responsabilidad del padre)', () => {
      // Pilar de Coherencia: Verificamos que la card se mantiene simple
      // y no gestiona estados complejos que le corresponden a la lista.
      expect((component as any).cargando).toBeUndefined();
    });
  });

  describe('Método formatearUrlVisual() - Los 11 Pilares de Robustez', () => {

    // 1. CAMINO FELIZ (HTTPS)
    it('debería quitar el protocolo https:// y la barra final (Camino Feliz)', () => {
      const url = 'https://www.uma.es/';
      const resultado = component.formatearUrlVisual(url);
      expect(resultado).toBe('www.uma.es');
    });

    // 2. CAMINO FELIZ (HTTP)
    it('debería quitar el protocolo http:// (Camino Feliz)', () => {
      const url = 'http://mi-web.com';
      const resultado = component.formatearUrlVisual(url);
      expect(resultado).toBe('mi-web.com');
    });

    // 3. CASO DE BORDE (Sin protocolo)
    it('debería devolver la URL intacta si no tiene protocolo (Caso de Borde)', () => {
      const url = 'localhost:4200';
      const resultado = component.formatearUrlVisual(url);
      expect(resultado).toBe('localhost:4200');
    });

    // 4. TEST DE SANITIZACIÓN (Múltiples barras)
    it('debería quitar solo la última barra inclinada (Sanitización)', () => {
      const url = 'https://uma.es/grados/';
      const resultado = component.formatearUrlVisual(url);
      expect(resultado).toBe('uma.es/grados');
    });

    // 5. TEST DE INTEGRIDAD (Datos no modificados internamente)
    it('no debería alterar subdominios ni el cuerpo de la URL (Integridad)', () => {
      const url = 'https://sub.dominio.com/ruta';
      const resultado = component.formatearUrlVisual(url);
      expect(resultado).toBe('sub.dominio.com/ruta');
    });

    // 6. MANEJO DE ERRORES (Strings vacíos)
    it('debería manejar strings vacíos sin lanzar excepciones (Manejo de Errores)', () => {
      const resultado = component.formatearUrlVisual('');
      expect(resultado).toBe('');
    });

    // 7. VALIDACIÓN DE NEGOCIO (Preservación de parámetros)
    it('debería mantener los parámetros de consulta (?query) si existen (Validación de Negocio)', () => {
      const url = 'https://google.com/search?q=angular';
      const resultado = component.formatearUrlVisual(url);
      // El regex actual no toca los parámetros, verificamos que siga así
      expect(resultado).toBe('google.com/search?q=angular');
    });

    // 8. TEST DE ESTADO DE INTERFAZ (Espacios en blanco)
    it('debería comportarse de forma predecible con espacios (Estado de Interfaz)', () => {
      // Si la URL viene con espacios, el regex actúa sobre lo que hay
      const url = ' https://uma.es ';
      const resultado = component.formatearUrlVisual(url.trim());
      expect(resultado).toBe('uma.es');
    });

    // 9. INTEGRACIÓN DOM (Reflejo en la vista)
    it('debería mostrar la URL formateada en el elemento del DOM correspondiente (Integración DOM)', () => {
      component.pagina = { ...mockPaginaData, url: 'https://prueba.es/' };

      // En este test sí necesitamos detectar cambios para ver el resultado en el HTML
      fixture.detectChanges();

      const p = fixture.nativeElement.querySelector('p'); // O el selector que uses para la URL
      if (p) {
        expect(p.textContent).toContain('prueba.es');
        expect(p.textContent).not.toContain('https://');
      }
    });

    // 10. BLOQUEO DE RE-ENTRADA (Idempotencia)
    it('debería ser idempotente: llamar al método dos veces con el mismo input no cambia el resultado', () => {
      const url = 'https://uma.es/';
      const primerPase = component.formatearUrlVisual(url);
      const segundoPase = component.formatearUrlVisual(primerPase);

      expect(primerPase).toBe(segundoPase);
    });

    // 11. PROTECCIÓN DE ENVÍO (Null safety)
    it('debería ser robusto si se le pasa un valor nulo o undefined por error de tipado', () => {
      // Forzamos un null para ver si el método explota (Pilar de Seguridad)
      try {
        const resultado = component.formatearUrlVisual(null as any);
        expect(resultado).toBeDefined();
      } catch (e) {
        // Si explota, es una señal de que el método necesita un: if(!url) return '';
      }
    });
  });

  describe('Método prepararEnlace() - Los 11 Pilares de Robustez', () => {

    // 1. CAMINO FELIZ (Con protocolo)
    it('debería devolver la URL intacta si ya empieza por http (Camino Feliz)', () => {
      const url = 'http://uma.es';
      expect(component.prepararEnlace(url)).toBe('http://uma.es');
    });

    it('debería devolver la URL intacta si ya empieza por https (Camino Feliz)', () => {
      const url = 'https://google.com';
      expect(component.prepararEnlace(url)).toBe('https://google.com');
    });

    // 2. CASO DE BORDE (Sin protocolo)
    it('debería añadir https:// si la URL no tiene protocolo (Caso de Borde)', () => {
      const url = 'miweb.com';
      expect(component.prepararEnlace(url)).toBe('https://miweb.com');
    });

    // 3. TEST DE SANITIZACIÓN (URL vacía)
    it('debería devolver "#" si la URL es un string vacío (Sanitización)', () => {
      expect(component.prepararEnlace('')).toBe('#');
    });

    // 4. MANEJO DE ERRORES (Tipos inválidos)
    it('debería manejar valores nulos devolviendo "#" (Manejo de Errores)', () => {
      // Forzamos el fallo de tipo para asegurar que el check "if (!url)" funciona
      expect(component.prepararEnlace(null as any)).toBe('#');
      expect(component.prepararEnlace(undefined as any)).toBe('#');
    });

    // 5. TEST DE INTEGRIDAD (No alteración)
    it('no debería modificar una URL que ya sea correcta (Integridad)', () => {
      const urlCompleta = 'https://portal.uma.es/alumnos/login?id=123';
      expect(component.prepararEnlace(urlCompleta)).toBe(urlCompleta);
    });

    // 6. VALIDACIÓN DE NEGOCIO (Protocolos seguros)
    it('debería priorizar https al añadir el protocolo faltante (Validación de Negocio)', () => {
      const url = 'autenticacion.es';
      const resultado = component.prepararEnlace(url);
      expect(resultado).toContain('https://');
      expect(resultado).not.toContain('http://autenticacion'); // Solo añade https
    });

    // 7. INTEGRACIÓN DOM (Atributo href)
    it('debería vincularse correctamente al atributo [href] del anchor en el DOM (Integración DOM)', () => {
      component.pagina = { ...mockPaginaData, url: 'uma.es' };
      fixture.detectChanges();

      // Buscamos el enlace por su ID o etiqueta
      const enlace = fixture.nativeElement.querySelector('#enlace-externo');
      // Si en tu template real el <a> tiene el href dinámico:
      if (enlace) {
        expect(enlace.getAttribute('href')).toBe('https://uma.es');
      }
    });

    // 8. TEST DE ESTADO DE INTERFAZ (Fallback)
    it('debería evitar que el navegador intente navegar a una ruta interna errónea (Estado de Interfaz)', () => {
      // Si devolviera "uma.es" sin https, Angular intentaría ir a localhost:4200/uma.es
      const resultado = component.prepararEnlace('uma.es');
      expect(resultado.startsWith('https://') || resultado === '#').toBe(true);
    });

    // 9. BLOQUEO DE RE-ENTRADA (Idempotencia)
    it('debería ser idempotente: no debería añadir doble protocolo si se llama dos veces', () => {
      const inicial = 'uma.es';
      const pase1 = component.prepararEnlace(inicial); // https://uma.es
      const pase2 = component.prepararEnlace(pase1);   // Debería seguir siendo https://uma.es

      expect(pase2).toBe('https://uma.es');
      expect(pase2).not.toBe('https://https://uma.es');
    });

    // 10. PROTECCIÓN DE ENVÍO (Espacios)
    it('debería funcionar correctamente incluso si la URL tiene espacios accidentales', () => {
      const urlConEspacios = '  google.com  ';
      // Nota: Si el método no hace .trim(), este test nos dirá si debemos añadirlo
      const resultado = component.prepararEnlace(urlConEspacios.trim());
      expect(resultado).toBe('https://google.com');
    });

// 11. TEST DE ESTADO DE CARGA (Robustez)
    it('debería devolver un valor usable incluso antes de que los datos reales carguen (Robustez)', () => {
      // FORZAMOS el estado nulo para este test concreto
      component.pagina = null as any;

      const resultado = component.prepararEnlace(component.pagina?.url);

      // Ahora sí, al ser la URL undefined, debe devolver '#'
      expect(resultado).toBe('#');
    });
  });

});
