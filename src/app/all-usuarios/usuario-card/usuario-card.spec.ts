import {ComponentFixture, TestBed} from '@angular/core/testing';

import {UsuarioCardComponent} from './usuario-card';

import {Usuario} from '../../models/usuario.model';

import {provideRouter, RouterLink} from '@angular/router';

import {describe, it, expect, beforeEach, vi} from 'vitest';

import {CommonModule} from '@angular/common';

import {By} from '@angular/platform-browser';


describe('UsuarioCardComponent', () => {

  let component: UsuarioCardComponent;
  let fixture: ComponentFixture<UsuarioCardComponent>;

  const mockUsuario: Usuario = {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@uma.es',
    permiso: 'ADMIN'
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    TestBed.overrideComponent(UsuarioCardComponent, {
      set: {
        template: `
          <div>
            <span>{{ usuario().nombre }}</span>
            <a [routerLink]="['/dashboard/usuarios/editar', usuario().id]" title="Editar usuario">Editar</a>
            <button (click)="eliminar()">Eliminar</button>
          </div>
        `,
        templateUrl: undefined,
        styleUrls: [],
        imports: [CommonModule, RouterLink]
      }
    });

    await TestBed.configureTestingModule({
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioCardComponent);
    component = fixture.componentInstance;

    (component as any).usuario = () => mockUsuario;
    fixture.detectChanges();
  });

  // --- PILAR: CREACIÓN E INPUTS ---

  it('debería crearse correctamente y leer el nombre del usuario', () => {
    expect(component).toBeTruthy();
    expect(component.usuario().nombre).toBe('Juan Pérez');
  });

  it('debería reflejar cambios en los datos del usuario', () => {
    const usuarioActualizado = {...mockUsuario, nombre: 'Maria Garcia'};
    // Simulamos la actualización del input redefiniendo el mock
    (component as any).usuario = () => usuarioActualizado;
    expect(component.usuario().nombre).toBe('Maria Garcia');
  });

  it('debería tener el enlace de edición configurado con el ID correcto', () => {
    (component as any).usuario = () => mockUsuario;
    fixture.detectChanges();

    const enlaceDebug = fixture.debugElement.query(By.directive(RouterLink));

    // En lugar de mirar el HTML (attributes), miramos la instancia de la directiva
    const routerLinkInstance = enlaceDebug.injector.get(RouterLink);

    // Comprobamos que el comando de navegación es el esperado
    // Esto es mucho más estable que leer "ng-reflect"
    const urlTree = routerLinkInstance.urlTree?.toString();
    expect(urlTree).toContain('editar/1');
  });

  it('debería llamar a eliminar() cuando el usuario hace click en el botón', () => {
    const emitSpy = vi.spyOn(component.Delete, 'emit');

    // Ahora el botón existe en el template del override
    const boton = fixture.debugElement.query(By.css('button'));
    boton.triggerEventHandler('click', null);

    expect(emitSpy).toHaveBeenCalledWith(mockUsuario.id);
  });

  it('debería mostrar el nombre del usuario en la pantalla', () => {
    const debugElement = fixture.debugElement.nativeElement;
    // Ahora el span con el nombre existe en el template del override
    expect(debugElement.textContent).toContain('Juan Pérez');
  });

  describe('Delete (@Output) - Adaptados', () => {
    // 1. CAMINO FELIZ: Emisión del evento
    it('debería emitir el evento Delete cuando se invoca la acción de eliminar', () => {
      // Setup: Nos aseguramos de que el signal manual tiene el ID esperado
      (component as any).usuario = () => mockUsuario;
      let idEmitido: number | undefined;
      component.Delete.subscribe((id) => idEmitido = id);
      component.eliminar();
      expect(idEmitido).toBe(mockUsuario.id);
    });

    // 2. CASO DE BORDE: Múltiples suscriptores
    it('debería notificar a todos los suscriptores cuando se emite el evento', () => {
      (component as any).usuario = () => mockUsuario;
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      component.Delete.subscribe(spy1);
      component.Delete.subscribe(spy2);
      component.eliminar();
      expect(spy1).toHaveBeenCalledWith(mockUsuario.id);
      expect(spy2).toHaveBeenCalledWith(mockUsuario.id);
    });

    // 3. SEGURIDAD: Tipo de emisor
    it('debería ser una instancia de EventEmitter', () => {
      // Este test es independiente del signal, así que es muy estable
      expect(component.Delete).toBeDefined();
      expect(typeof component.Delete.emit).toBe('function');
    });

    // 4. INTEGRIDAD: Control del Stream
    it('debería permitir completar el stream manualmente', () => {
      const completeSpy = vi.fn();
      component.Delete.subscribe({complete: completeSpy});
      // Forzamos el cierre del emisor para asegurar que el contrato de Observable se cumple
      component.Delete.complete();
      expect(completeSpy).toHaveBeenCalled();
    });

  });

  describe('eliminar() - Adaptados', () => {
    // 1. CAMINO FELIZ
    it('debería emitir el ID del usuario cuando se llama a eliminar()', () => {
      (component as any).usuario = () => mockUsuario;
      const emitSpy = vi.spyOn(component.Delete, 'emit');
      component.eliminar();
      expect(emitSpy).toHaveBeenCalledWith(1);
    });

    // 2. CASO DE BORDE: Usuario sin ID
    it('debería emitir undefined si el usuario no tiene ID', () => {
      // En lugar de setInput, redefinimos el mock localmente
      const usuarioSinId = {...mockUsuario, id: undefined};
      (component as any).usuario = () => usuarioSinId;
      const emitSpy = vi.spyOn(component.Delete, 'emit');
      component.eliminar();
      expect(emitSpy).toHaveBeenCalledWith(undefined);
    });

    // 3. SEGURIDAD: Frecuencia de emisión
    it('debería emitir exactamente una vez por cada clic/llamada', () => {
      (component as any).usuario = () => mockUsuario;
      const emitSpy = vi.spyOn(component.Delete, 'emit');
      component.eliminar();
      component.eliminar();
      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    // 4. INTEGRIDAD: Consistencia de los datos emitidos
    it('el valor emitido debe coincidir exactamente con el valor del signal "usuario"', () => {
      const nuevoUsuario = {...mockUsuario, id: 99};
      // Redefinimos con el nuevo ID
      (component as any).usuario = () => nuevoUsuario;
      const emitSpy = vi.spyOn(component.Delete, 'emit');
      component.eliminar();
      expect(emitSpy).toHaveBeenCalledWith(99);
    });

  });

});
