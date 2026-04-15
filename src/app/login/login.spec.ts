import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // <--- FALTA ESTA LÍNEA
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
describe('LoginComponent', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  // Mocks de dependencias
  const mockAuthService = {
    login: vi.fn()
  };
  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      // 1. IMPORTANTE: Quitamos 'Login' de imports para que no intente
      // procesar su HTML antes de que podamos hacer el override.
      imports: [FormsModule, CommonModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    // 2. TRUCO PARA LA TERMINAL: Anulamos el templateUrl
    TestBed.overrideComponent(Login, {
      set: {
        template: '<div></div>',
        templateUrl: undefined
      }
    });

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('loginReal()', () => {
    const emailTest = 'usuario@uma.es';
    const passwordTest = '123456';

    beforeEach(() => {
      // Configuramos las propiedades del componente antes de cada test
      component.email = emailTest;
      component.password = passwordTest;
      component.errorMessage.set('');
    });

    // 1. CAMINO FELIZ
    it('debería navegar al dashboard tras un login exitoso y limpiar errores previos', () => {
      // Setup: El servicio responde con éxito
      mockAuthService.login.mockReturnValue(of({ token: 'fake-jwt' }));

      component.loginReal();

      // Verificamos que se llamó al servicio con los datos correctos
      expect(mockAuthService.login).toHaveBeenCalledWith(emailTest, passwordTest);

      // Verificamos la navegación al éxito
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard/monitoreos']);

      // Verificamos que el signal de error esté vacío
      expect(component.errorMessage()).toBe('');
    });

    // 2. CASO DE BORDE / SEGURIDAD
    it('debería limpiar el mensaje de error inmediatamente al intentar loguear de nuevo', () => {
      // Setup: Simulamos que había un error previo
      component.errorMessage.set('Error previo');
      mockAuthService.login.mockReturnValue(of({})); // Éxito en este intento

      component.loginReal();

      // El código hace .set('') justo al empezar el método
      expect(component.errorMessage()).toBe('');
    });

    // 3. MANEJO DE ERRORES
    it('debería mostrar el mensaje de error específico si las credenciales fallan', () => {
      // Setup: El servicio devuelve un error
      mockAuthService.login.mockReturnValue(throwError(() => new Error('Unauthorized')));

      component.loginReal();

      // Verificamos que no navegó
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      // Verificamos que el signal capturó el error de la lógica del componente
      expect(component.errorMessage()).toBe('Error: Usuario o contraseña incorrectos');
    });

    // 4. INTEGRIDAD
    it('debería mantener los valores de email y password intactos tras la ejecución', () => {
      mockAuthService.login.mockReturnValue(of({}));

      component.loginReal();

      // Aseguramos que el componente no "limpia" los campos de texto, permitiendo reintentos
      expect(component.email).toBe(emailTest);
      expect(component.password).toBe(passwordTest);
    });
  });


});
