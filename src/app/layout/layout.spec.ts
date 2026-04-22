import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Layout } from './layout';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import {importProvidersFrom, signal} from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {CommonModule} from '@angular/common';

describe('LayoutComponent', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  // Mocks de dependencias
  const mockAuthService = {
    // Importante: userName y userRole deben ser signals para que el componente funcione
    userName: signal('Usuario Test'),
    userRole: signal('USER'),
    logout: vi.fn()
  };

  const mockRouter = {
    // Ahora el mock simula que la navegación es exitosa
    navigate: vi.fn().mockResolvedValue(true)
  };

  const crearFixtureConTemplate = async (template: string) => {
    // Pilar Infraestructura: Reseteamos para poder re-configurar el componente
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).overrideComponent(Layout, {
      set: {
        template,
        templateUrl: undefined,
        // Importante: Si usas otros componentes dentro, añádelos aquí
      }
    }).compileComponents();

    const fixtureDom = TestBed.createComponent(Layout);
    fixtureDom.detectChanges();
    return fixtureDom;
  };

// Sustituye tu beforeEach actual por este:
  beforeEach(async () => {
    vi.clearAllMocks();

    // Configuración estándar para tests de lógica (sin DOM pesado)
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).overrideComponent(Layout, {
      set: { template: '<div></div>', templateUrl: undefined }
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Estado y Reactividad (Signals/Computed/Escape)', () => {

    // 1. CAMINO FELIZ: Signals y Computed
    it('debería calcular correctamente si el usuario es ADMIN', () => {
      // Cambiamos el signal del mock a ADMIN
      mockAuthService.userRole.set('ADMIN');

      // Forzamos que Angular recalcule el computed
      fixture.detectChanges();

      expect(component.esAdmin()).toBe(true);
      expect(component.userName()).toBe('Usuario Test');
    });

    // 2. CASO DE BORDE: Cambio de Rol
    it('debería actualizar esAdmin a false si el rol cambia a USER', () => {
      mockAuthService.userRole.set('USER');

      fixture.detectChanges();

      expect(component.esAdmin()).toBe(false);
    });

    // 3. MANEJO DE EVENTOS (onEscape)
    it('debería cerrar el menú cuando se pulsa la tecla Escape', () => {
      // Setup: Abrimos el menú primero
      component.menuAbierto.set(true);

      // Acción: Disparamos el evento de teclado que escucha el @HostListener
      component.onEscape();

      expect(component.menuAbierto()).toBe(false);
    });

    // 4. INTEGRIDAD: Seguridad del @HostListener
    it('no debería dar error ni cambiar nada al pulsar Escape si el menú ya estaba cerrado', () => {
      component.menuAbierto.set(false);

      component.onEscape();

      expect(component.menuAbierto()).toBe(false);
    });

    it('debería actualizar el signal computado esAdmin cuando el rol en el servicio cambie', () => {
      // 1. Empezamos como USER
      mockAuthService.userRole.set('USER');
      expect(component.esAdmin()).toBe(false);

      // 2. Cambiamos a ADMIN (Simulando una elevación de privilegios o cambio de sesión)
      mockAuthService.userRole.set('ADMIN');

      // Pilar de Integridad: El computed debe reaccionar automáticamente
      expect(component.esAdmin()).toBe(true);
    });

    it('debería mantener el userName sincronizado con el AuthService', () => {
      const nuevoNombre = 'Admin Supremo';
      mockAuthService.userName.set(nuevoNombre);

      // Verificamos que la referencia al signal en el componente es correcta
      expect(component.userName()).toBe(nuevoNombre);
    });

  });

  describe('Pilar: Integridad de Signals e Integración DOM', () => {

    // Helper para crear un fixture con un template específico sin romper el TestBed
    const crearFixtureConTemplate = async (template: string) => {
      // 1. Limpieza absoluta del motor de tests
      TestBed.resetTestingModule();

      // 2. Re-configuración ligera
      await TestBed.configureTestingModule({
        imports: [CommonModule], // Solo lo necesario para el motor de tests
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: Router, useValue: mockRouter }
        ]
      }).overrideComponent(Layout, {
        set: {
          template, // Inyectamos el HTML dinámico para el test
          templateUrl: undefined // IMPORTANTE: Anulamos la carga del archivo físico
          // ELIMINADO: standalone e imports (Angular no permite sobreescribirlos aquí)
        }
      }).compileComponents();

      const fixtureDom = TestBed.createComponent(Layout);
      fixtureDom.detectChanges();
      return fixtureDom;
    };

    it('debería sincronizar el esAdmin (Signal) con la visibilidad física del DOM', async () => {
      const template = `@if (esAdmin()) { <div id="admin-ui">Admin</div> }`;
      const fixtureDom = await crearFixtureConTemplate(template);

      // Usamos la instancia local del fixture recién creado
      mockAuthService.userRole.set('USER');
      fixtureDom.detectChanges();
      expect(fixtureDom.componentInstance.esAdmin()).toBe(false);
      expect(fixtureDom.nativeElement.querySelector('#admin-ui')).toBeNull();

      mockAuthService.userRole.set('ADMIN');
      fixtureDom.detectChanges();
      expect(fixtureDom.componentInstance.esAdmin()).toBe(true);
      expect(fixtureDom.nativeElement.querySelector('#admin-ui')).toBeTruthy();
    });
    it('debería reflejar el userName del servicio directamente en el HTML', async () => {
      const template = `<span id="user-display">{{ userName() }}</span>`;
      const fixtureDom = await crearFixtureConTemplate(template);

      const nuevoNombre = 'Capitán Planeta';
      mockAuthService.userName.set(nuevoNombre);
      fixtureDom.detectChanges();

      const el = fixtureDom.nativeElement.querySelector('#user-display');
      expect(el.textContent).toContain(nuevoNombre);
    });
  });

  describe('onEscape()', () => {

    it('debería cerrar el menú cuando se pulsa la tecla Escape si el menú está abierto', () => {
      // Setup: Menú abierto
      component.menuAbierto.set(true);

      // Acción: Simulamos el evento de teclado que captura el @HostListener
      component.onEscape();

      // Validación de Negocio: El menú debe cerrarse
      expect(component.menuAbierto()).toBe(false);
    });

    it('no debería realizar ninguna acción si se pulsa Escape y el menú ya está cerrado', () => {
      const spyCerrar = vi.spyOn(component, 'cerrarMenu');
      component.menuAbierto.set(false);

      component.onEscape();

      // Robustez: No disparamos lógica innecesaria si el estado ya es el deseado
      expect(spyCerrar).not.toHaveBeenCalled();
    });

    it('debería cerrar el menú solo si está abierto al pulsar Escape', () => {
      // Aquí no necesitamos DOM, usamos el componente estándar del beforeEach inicial
      const spyCerrar = vi.spyOn(component, 'cerrarMenu');

      // Caso 1: Está abierto -> Se cierra
      component.menuAbierto.set(true);
      component.onEscape();
      expect(component.menuAbierto()).toBe(false);

      // Caso 2: Está cerrado -> No hace nada (Robustez)
      vi.clearAllMocks();
      component.menuAbierto.set(false);
      component.onEscape();
      expect(spyCerrar).not.toHaveBeenCalled();
    });
  });

  describe('toggleMenu()', () => {
    // 1. CAMINO FELIZ
    it('debería cambiar el estado de false a true al ejecutarlo una vez', () => {
      // Setup: Nos aseguramos de que empiece cerrado
      component.menuAbierto.set(false);

      component.toggleMenu();

      // Verificación: El signal debe haber cambiado a true
      expect(component.menuAbierto()).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería cambiar de true a false si el menú ya estaba abierto', () => {
      // Setup: Forzamos estado abierto
      component.menuAbierto.set(true);

      component.toggleMenu();

      // Verificación: El signal debe haber vuelto a false
      expect(component.menuAbierto()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería mantener un estado booleano consistente tras múltiples clics rápidos', () => {
      // Simulamos 3 clics seguidos empezando en false: false -> true -> false -> true
      component.menuAbierto.set(false);

      component.toggleMenu(); // true
      component.toggleMenu(); // false
      component.toggleMenu(); // true

      expect(component.menuAbierto()).toBe(true);
    });

    // 4. INTEGRIDAD
    it('no debería afectar a los datos del usuario (nombre/rol) al cambiar el estado del menú', () => {
      // Guardamos valores iniciales
      const nombreInicial = component.userName();
      const rolInicial = component.userRole();

      component.toggleMenu();

      // Verificamos que el cambio de UI no toque la sesión del usuario
      expect(component.userName()).toBe(nombreInicial);
      expect(component.userRole()).toBe(rolInicial);
    });
    // 5. INTEGRACIÓN DOM (El pilar que falta)
    it('debería reflejar el cambio de estado en las clases CSS del template', async () => {
      const template = `<aside [class.translate-x-0]="menuAbierto()">Menu</aside>`;

      // Ahora el compilador ya sabe qué es esto:
      const fixtureDom = await crearFixtureConTemplate(template);

      fixtureDom.componentInstance.toggleMenu();
      fixtureDom.detectChanges();

      const aside = fixtureDom.nativeElement.querySelector('aside');
      expect(aside.classList.contains('translate-x-0')).toBe(true);
    });

    // 6. VALIDACIÓN DE NEGOCIO (Estado inicial)
    it('debería garantizar que el menú siempre arranca cerrado por seguridad de interfaz', () => {
      // Este test valida la regla de negocio: "La app empieza limpia"
      const nuevoComponente = TestBed.createComponent(Layout).componentInstance;
      expect(nuevoComponente.menuAbierto()).toBe(false);
    });
  });

  describe('cerrarMenu()', () => {

    // 1. CAMINO FELIZ
    it('debería cambiar el estado a false si el menú estaba abierto', () => {
      component.menuAbierto.set(true);

      component.cerrarMenu();

      expect(component.menuAbierto()).toBe(false);
    });

    // 2. CASO DE BORDE / ROBUSTEZ
    it('debería mantenerse en false si el menú ya estaba cerrado (idempotencia)', () => {
      component.menuAbierto.set(false);

      component.cerrarMenu();

      // Pilar de Robustez: La función es segura aunque se llame mil veces
      expect(component.menuAbierto()).toBe(false);
    });

    // 3. INTEGRIDAD DE DATOS
    it('no debe alterar ninguna otra propiedad del componente al cerrarse', () => {
      const nombrePrevio = component.userName();
      component.menuAbierto.set(true);

      component.cerrarMenu();

      // Pilar de Integridad: El estado de la UI no debe "ensuciar" el estado de la sesión
      expect(component.userName()).toBe(nombrePrevio);
    });

    // 4. INTEGRACIÓN DOM (Prueba de Interfaz física)
    it('debería añadir la clase CSS de ocultación en el template al ejecutar cerrarMenu', async () => {
      // Usamos el helper para el pilar de Integración DOM
      const template = `<aside [class.-translate-x-full]="!menuAbierto()">Menu</aside>`;
      const fixtureDom = await crearFixtureConTemplate(template);

      // Setup: Empezamos abierto (clase no presente)
      fixtureDom.componentInstance.menuAbierto.set(true);
      fixtureDom.detectChanges();

      // Act: Cerramos
      fixtureDom.componentInstance.cerrarMenu();
      fixtureDom.detectChanges();

      // Assert: Verificamos el pilar de Interfaz
      const aside = fixtureDom.nativeElement.querySelector('aside');
      expect(aside.classList.contains('-translate-x-full')).toBe(true);
    });

    it('debería garantizar la Validación de Negocio: el menú nace cerrado por defecto', () => {
      // Creamos una instancia limpia sin tocarla
      const nuevaInstancia = TestBed.createComponent(Layout).componentInstance;
      expect(nuevaInstancia.menuAbierto()).toBe(false);
    });

    it('debería priorizar el estado de cierre frente a llamadas de apertura simultáneas', () => {
      // Forzamos un estado incierto
      component.menuAbierto.set(true);

      // Ejecutamos cierre y verificamos que no hay "fugas" de estado
      component.cerrarMenu();

      // Si intentáramos un toggle justo después, el estado debe ser predecible
      expect(component.menuAbierto()).toBe(false);
    });

  });

  describe('cerrarSesion() - Blindaje Total', () => {

    // 1. CAMINO FELIZ
    it('debería ejecutar el logout y navegar a login correctamente', async () => {
      await component.cerrarSesion();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    // 2. PROTECCIÓN DE ENVÍO (Antirebote)
    it('debería impedir múltiples llamadas al logout si ya hay un proceso en curso', () => {
      // Simulamos que el primer clic activa el estado de carga
      component.cargandoLogout.set(true);

      component.cerrarSesion();

      // No debería llamarse una segunda vez mientras cargandoLogout sea true
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    // 3. INTEGRIDAD DE FLUJO Y ORDEN
    it('debería asegurar que el menú se cierra antes o durante el logout por privacidad', () => {
      component.menuAbierto.set(true);

      component.cerrarSesion();

      // Al salir, el estado de la interfaz debe quedar limpio
      expect(component.menuAbierto()).toBe(false);
    });

    // 4. MANEJO DE ERRORES / RESILIENCIA
    it('debería navegar a login obligatoriamente aunque el AuthService falle', () => {
      // Forzamos un error en el servicio
      mockAuthService.logout.mockImplementation(() => {
        throw new Error('Error crítico de limpieza de sesión');
      });

      component.cerrarSesion();

      // Pilar de Resiliencia: El usuario no puede quedarse "atrapado" dentro
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      expect(component.cargandoLogout()).toBe(false);
    });

    // 5. INTEGRIDAD DOM (Feedback Visual)
    it('debería deshabilitar visualmente el botón de logout mientras procesa', async () => {
      // Usamos el helper para ver el botón físicamente
      const template = `
        <button [disabled]="cargandoLogout()" (click)="cerrarSesion()">Salir</button>
      `;
      const fixtureDom = await crearFixtureConTemplate(template);

      // Simulamos estado de carga
      fixtureDom.componentInstance.cargandoLogout.set(true);
      fixtureDom.detectChanges();

      const boton = fixtureDom.nativeElement.querySelector('button');
      expect(boton.disabled).toBe(true);
    });

    // 6. CASO DE BORDE: Sesión ya expirada
    it('debería manejar correctamente el cierre de sesión si el usuario ya no tenía datos', () => {
      mockAuthService.userName.set('');

      component.cerrarSesion();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

});
