import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilComponent } from './perfil';
import { UsuarioService } from '../services/usuario.service';
import { MonitoreoService } from '../services/monitoreo.service';
import { AuthService } from '../services/auth';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {Usuario} from '../models/usuario.model';
import {CommonModule} from '@angular/common';

describe('PerfilComponent', () => {
  let component: PerfilComponent;
  let fixture: ComponentFixture<PerfilComponent>;

  const mockUsuarioService = {
    getPerfil: vi.fn(),
    updatePerfil: vi.fn()
  };
  const mockMonitoreoService = {
    getMisMonitoreos: vi.fn(),
    getColaboraciones: vi.fn()
  };
  const mockAuthService = {
    actualizarDatosTrasCambio: vi.fn(),
    logout: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [FormsModule, CommonModule],
      providers: [
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: MonitoreoService, useValue: mockMonitoreoService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    TestBed.overrideComponent(PerfilComponent, {
      set: { template: '<div></div>', templateUrl: undefined }
    });

    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;

    // Setup básico, pero NO llamamos a detectChanges aquí
    mockUsuarioService.getPerfil.mockReturnValue(of({ nombre: 'Test', email: 'test@uma.es' }));
    mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
    mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('cargarDatos()', () => {
    const mockUser: Usuario = {
      id: 1,
      nombre: 'Usuario Prueba',
      email: 'prueba@uma.es',
      permiso: 'ADMIN'
    };

    const mockPropios = [{ id: 10, nombre: 'Monitor 1' }];
    const mockInvitado = [{ id: 20, nombre: 'Colab 1' }, { id: 21, nombre: 'Colab 2' }];

    // 1. CAMINO FELIZ
    it('debería asignar los datos a los signals y actualizar los computed correctamente', () => {
      // Setup específico
      mockUsuarioService.getPerfil.mockReturnValue(of(mockUser));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of(mockPropios));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of(mockInvitado));

      // Acción: Disparamos el ciclo de vida
      fixture.detectChanges();

      // Verificación de Signals
      expect(component.usuario()).toEqual(mockUser);
      expect(component.monitoreosPropios()).toEqual(mockPropios);
      expect(component.monitoreosInvitado()).toEqual(mockInvitado);

      // Verificación de Computed (Lógica reactiva)
      expect(component.propiosCount()).toBe(1);
      expect(component.invitadoCount()).toBe(2);
    });

    // 2. CASO DE BORDE
    it('debería inicializar los contadores en 0 si las listas de monitoreo están vacías', () => {
      mockUsuarioService.getPerfil.mockReturnValue(of(mockUser));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      fixture.detectChanges();

      expect(component.propiosCount()).toBe(0);
      expect(component.invitadoCount()).toBe(0);
      expect(component.usuario()).not.toBeNull();
    });

    // 3. MANEJO DE ERRORES
    it('debería capturar y registrar el error si falla la carga del perfil', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorResponse = { status: 500, message: 'Fallo de conexión' };

      mockUsuarioService.getPerfil.mockReturnValue(throwError(() => errorResponse));
      // Los otros servicios responden bien
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      fixture.detectChanges();

      // Verificamos que el error se capturó en el bloque error del subscribe
      expect(consoleSpy).toHaveBeenCalledWith("Error al obtener perfil", errorResponse);
      // El signal de usuario permanece en su estado inicial (null)
      expect(component.usuario()).toBeNull();
    });

    // 4. INTEGRIDAD
    it('debería garantizar que se consultan los tres endpoints necesarios al cargar el componente', () => {
      mockUsuarioService.getPerfil.mockReturnValue(of(mockUser));
      mockMonitoreoService.getMisMonitoreos.mockReturnValue(of([]));
      mockMonitoreoService.getColaboraciones.mockReturnValue(of([]));

      fixture.detectChanges();

      // Verificamos que se han invocado los métodos inyectados
      expect(mockUsuarioService.getPerfil).toHaveBeenCalled();
      expect(mockMonitoreoService.getMisMonitoreos).toHaveBeenCalled();
      expect(mockMonitoreoService.getColaboraciones).toHaveBeenCalled();
    });
  });

  describe('activarEdicion()', () => {
    const mockUser: Usuario = { id: 1, nombre: 'Juan', email: 'juan@uma.es' };

    // 1. CAMINO FELIZ
    it('debería copiar los datos del usuario al signal de edición y activar el modo editando', () => {
      // Setup: Ponemos un usuario en el signal
      component.usuario.set(mockUser);

      component.activarEdicion();

      // Verificamos que se activó y copió los datos
      expect(component.editando()).toBe(true);
      expect(component.datosEdit()).toEqual({ nombre: 'Juan', email: 'juan@uma.es' });
    });

    // 2. CASO DE BORDE
    it('no debería hacer nada si el usuario es null', () => {
      component.usuario.set(null);
      component.editando.set(false);

      component.activarEdicion();

      expect(component.editando()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería asegurar que los datos de edición sean una copia y no la misma referencia', () => {
      component.usuario.set(mockUser);
      component.activarEdicion();

      // Modificamos el objeto de edición
      component.datosEdit().nombre = 'Cambiado';

      // El usuario original NO debería haber cambiado (inmutabilidad)
      expect(component.usuario()?.nombre).toBe('Juan');
    });

    // 4. INTEGRIDAD (Estado coherente)
    it('debería cerrar el modo edición de password al activar la edición de info', () => {
      component.usuario.set(mockUser);
      component.editandoPassword.set(true); // Simulamos que la otra estaba abierta

      component.activarEdicion();

      // Verificamos que se "limpió" el estado de la otra edición
      expect(component.editandoPassword()).toBe(false);
      expect(component.editando()).toBe(true);
    });
  });

  describe('cancelarEdicion()', () => {
    // 1. CAMINO FELIZ
    it('debería desactivar el modo edición', () => {
      // Setup: Forzamos el estado de edición a true
      component.editando.set(true);

      component.cancelarEdicion();

      // Verificación
      expect(component.editando()).toBe(false);
    });

    // 2. CASO DE BORDE
    it('debería mantener el modo edición desactivado si ya lo estaba', () => {
      component.editando.set(false);

      component.cancelarEdicion();

      expect(component.editando()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('no debería alterar los datos del usuario original al cancelar', () => {
      const usuarioOriginal = { nombre: 'Original', email: 'orig@uma.es' };
      component.usuario.set(usuarioOriginal);
      component.editando.set(true);

      // Simulamos que el usuario escribió algo en los inputs antes de cancelar
      component.datosEdit.set({ nombre: 'Modificado', email: 'mod@uma.es' });

      component.cancelarEdicion();

      // Verificamos que el usuario del signal principal sigue intacto
      expect(component.usuario()).toEqual(usuarioOriginal);
    });

    // 4. INTEGRIDAD
    it('debería ser una operación puramente local y no llamar a ningún servicio', () => {
      component.cancelarEdicion();

      // Verificamos que no se haya intentado guardar nada en el servidor
      expect(mockUsuarioService.updatePerfil).not.toHaveBeenCalled();
      expect(mockAuthService.actualizarDatosTrasCambio).not.toHaveBeenCalled();
    });
  });

  describe('guardarCambios()', () => {
    const usuarioOriginal: Usuario = { id: 1, nombre: 'Juan', email: 'juan@uma.es', permiso: 'USER' };
    const datosEditados = { nombre: ' Juan Editado ', email: ' editado@uma.es ' }; // Con espacios para probar trim

    beforeEach(() => {
      // Seteamos el estado inicial antes de cada test de este bloque
      component.usuario.set(usuarioOriginal);
      component.datosEdit.set({ ...datosEditados });
      component.editando.set(true);
    });

    // 1. CAMINO FELIZ
    it('debería limpiar espacios, guardar cambios y actualizar la sesión correctamente', () => {
      const usuarioRespondido = { ...usuarioOriginal, nombre: 'Juan Editado', email: 'editado@uma.es' };
      mockUsuarioService.updatePerfil.mockReturnValue(of(usuarioRespondido));

      component.guardarCambios();

      // Verificación de limpieza (Pilar 1)
      expect(mockUsuarioService.updatePerfil).toHaveBeenCalledWith({
        nombre: 'Juan Editado',
        email: 'editado@uma.es'
      });

      // Verificación de actualización de UI y Signals
      expect(component.usuario()).toEqual(usuarioRespondido);
      expect(component.editando()).toBe(false);

      // Verificación de integridad con AuthService (Pilar 4)
      expect(mockAuthService.actualizarDatosTrasCambio).toHaveBeenCalledWith('editado@uma.es', 'Juan Editado');
    });

    // 2. CASOS DE BORDE (Validaciones)
    it('debería mostrar alerta y no enviar si los campos están vacíos o solo tienen espacios', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.datosEdit.set({ nombre: '   ', email: '   ' });

      component.guardarCambios();

      expect(alertSpy).toHaveBeenCalledWith('El nombre y el email son obligatorios y no pueden contener solo espacios.');
      expect(mockUsuarioService.updatePerfil).not.toHaveBeenCalled();
    });

    it('debería rechazar formatos de email inválidos', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.datosEdit.set({ nombre: 'Usuario', email: 'correo-no-valido' });

      component.guardarCambios();

      expect(alertSpy).toHaveBeenCalledWith('Por favor, introduce un formato de correo electrónico válido.');
      expect(mockUsuarioService.updatePerfil).not.toHaveBeenCalled();
    });

    // 3. MANEJO DE ERRORES
    it('debería mostrar alerta de error si el servidor rechaza la actualización (ej: email duplicado)', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUsuarioService.updatePerfil.mockReturnValue(throwError(() => ({ status: 400 })));

      component.guardarCambios();

      expect(consoleSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Error: El email podría estar ya en uso o el servidor rechazó los datos.');
      // El modo edición debería permanecer abierto para que el usuario corrija
      expect(component.editando()).toBe(true);
    });

    // 4. INTEGRIDAD
    it('debería mantener el resto de propiedades del objeto datosEdit al enviar', () => {
      // Si hubiera más campos en datosEdit, comprobamos que no se pierden
      mockUsuarioService.updatePerfil.mockReturnValue(of(usuarioOriginal));

      component.guardarCambios();

      const llamada = mockUsuarioService.updatePerfil.mock.calls[0][0];
      expect(llamada).toHaveProperty('nombre');
      expect(llamada).toHaveProperty('email');
    });
  });

  describe('activarEdicionPassword()', () => {
    // 1. CAMINO FELIZ
    it('debería resetear la nueva password a vacío y activar el modo edición de password', () => {
      // Setup: Simulamos que había algo escrito de antes
      component.nuevaPassword.set('password123');
      component.editandoPassword.set(false);

      component.activarEdicionPassword();

      // Verificación: Siempre debe empezar limpia por seguridad
      expect(component.nuevaPassword()).toBe('');
      expect(component.editandoPassword()).toBe(true);
    });

    // 2. CASO DE BORDE
    it('debería funcionar correctamente incluso si ya estaba en modo edición de password', () => {
      component.editandoPassword.set(true);
      component.nuevaPassword.set('secreto');

      component.activarEdicionPassword();

      expect(component.editandoPassword()).toBe(true);
      expect(component.nuevaPassword()).toBe('');
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería asegurar que la contraseña no se persista accidentalmente entre aperturas', () => {
      // Actuamos dos veces
      component.nuevaPassword.set('intento1');
      component.activarEdicionPassword();

      component.nuevaPassword.set('intento2');
      component.activarEdicionPassword();

      // Al llamar al método, siempre debe forzar el string vacío
      expect(component.nuevaPassword()).toBe('');
    });

    // 4. INTEGRIDAD (Estado coherente)
    it('debería cerrar el modo edición de información general al activar el de password', () => {
      // Setup: Modo edición normal abierto
      component.editando.set(true);

      component.activarEdicionPassword();

      // Verificación: Solo puede haber un panel de edición activo
      expect(component.editando()).toBe(false);
      expect(component.editandoPassword()).toBe(true);
    });
  });

  describe('cancelarEdicionPassword()', () => {
    // 1. CAMINO FELIZ
    it('debería desactivar el modo edición de contraseña', () => {
      // Setup: Forzamos el estado de edición de password a true
      component.editandoPassword.set(true);

      component.cancelarEdicionPassword();

      // Verificación
      expect(component.editandoPassword()).toBe(false);
    });

    // 2. CASO DE BORDE
    it('debería mantener el modo edición de contraseña desactivado si ya lo estaba', () => {
      component.editandoPassword.set(false);

      component.cancelarEdicionPassword();

      expect(component.editandoPassword()).toBe(false);
    });

    // 3. MANEJO DE ERRORES / SEGURIDAD
    it('debería resetear la señal de nuevaPassword al cancelar por seguridad', () => {
      // Aunque el código actual solo setea editandoPassword a false,
      // es una buena práctica de seguridad verificar que no se queden datos sensibles.
      component.nuevaPassword.set('secreto123');

      component.cancelarEdicionPassword();

      // En tu código actual de perfil.ts, cancelar solo cambia el booleano.
      // Si quisieras limpiar la pass al cancelar, deberías añadirlo en el .ts
      expect(component.editandoPassword()).toBe(false);
    });

    // 4. INTEGRIDAD
    it('no debería disparar ninguna acción de logout ni llamadas al servidor', () => {
      component.cancelarEdicionPassword();

      // Verificamos que no se haya llamado accidentalmente a servicios externos
      expect(mockUsuarioService.updatePerfil).not.toHaveBeenCalled();
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });

  describe('guardarPassword()', () => {
    const mockUser: Usuario = { id: 1, nombre: 'Test', email: 'test@uma.es', permiso: 'USER' };

    beforeEach(() => {
      // Seteamos un usuario para que la validación if(!userActual) pase
      component.usuario.set(mockUser);
      component.editandoPassword.set(true);
      // Espiamos el objeto global location para la redirección
      vi.stubGlobal('location', { href: '' });
    });

    // 1. CAMINO FELIZ
    it('debería limpiar la pass, actualizarla, cerrar sesión y redirigir al login', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.nuevaPassword.set('  nuevaPass123  '); // Con espacios
      mockUsuarioService.updatePerfil.mockReturnValue(of({ ...mockUser }));

      component.guardarPassword();

      // Verificación de limpieza y envío (Pilar 1)
      expect(mockUsuarioService.updatePerfil).toHaveBeenCalledWith(expect.objectContaining({
        contrasenia: 'nuevaPass123'
      }));

      // Verificación de efectos secundarios (Pilar 4)
      expect(alertSpy).toHaveBeenCalledWith('Contraseña actualizada con éxito. Inicia sesión de nuevo.');
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(globalThis.location.href).toBe('/login');
    });

    // 2. CASOS DE BORDE (Validaciones de longitud)
    it('debería rechazar contraseñas vacías o que solo contengan espacios', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.nuevaPassword.set('   ');

      component.guardarPassword();

      expect(alertSpy).toHaveBeenCalledWith('La contraseña no puede estar vacía ni contener solo espacios.');
      expect(mockUsuarioService.updatePerfil).not.toHaveBeenCalled();
    });

    it('debería rechazar contraseñas de menos de 4 caracteres reales', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.nuevaPassword.set(' 123 '); // Tiene 5 caracteres pero solo 3 son válidos tras trim

      component.guardarPassword();

      expect(alertSpy).toHaveBeenCalledWith('La contraseña debe tener al menos 4 caracteres (sin contar espacios en los extremos).');
    });

    // 3. MANEJO DE ERRORES
    it('debería mostrar el error del servidor si la actualización falla', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      const serverError = { error: 'La contraseña es demasiado débil' };
      mockUsuarioService.updatePerfil.mockReturnValue(throwError(() => ({ error: 'La contraseña es demasiado débil' })));

      component.nuevaPassword.set('123456');
      component.guardarPassword();

      expect(alertSpy).toHaveBeenCalledWith(serverError.error);
      // No debería redirigir ni cerrar sesión si falla
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    // 4. INTEGRIDAD
    it('no debería hacer nada si no hay un usuario cargado en el sistema', () => {
      component.usuario.set(null);
      component.nuevaPassword.set('123456');

      component.guardarPassword();

      expect(mockUsuarioService.updatePerfil).not.toHaveBeenCalled();
    });
  });

});
