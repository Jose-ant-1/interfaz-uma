import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Login} from './login';
import {AuthService} from '../services/auth';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common'; // <--- FALTA ESTA LÍNEA
import {delay, of, Subject, throwError} from 'rxjs';
import {describe, it, expect, beforeEach, vi} from 'vitest';

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
        {provide: AuthService, useValue: mockAuthService},
        {provide: Router, useValue: mockRouter}
      ]
    }).compileComponents();

    // 2. TRUCO PARA LA TERMINAL: Anulamos el templateUrl
    TestBed.overrideComponent(Login, {
      set: {
        template: `
        <div>
          <button (click)="loginReal()" [disabled]="loading()">Login</button>
          @if (errorMessage()) {
            <p class="text-red-500">{{ errorMessage() }}</p>
          }
        </div>
      `,
        templateUrl: undefined
      }
    });

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Pilar: Protección de Envío y Robustez', () => {

// 1. PROTECCIÓN DE ENVÍO (Evitar spam al backend)
    it('debería bloquear múltiples llamadas al servicio si ya hay un proceso en curso', () => {
      // VALIDACIÓN DE NEGOCIO: Necesitamos datos para que el método no haga 'return'
      component.email = 'admin@uma.es';
      component.password = '123456';

      // Simulamos que el servicio tarda 100ms en responder
      mockAuthService.login.mockReturnValue(of({}).pipe(delay(100)));

      component.loginReal(); // Primer click (ejecuta la llamada)
      component.loginReal(); // Segundo click (bloqueado por pilar de Protección de Envío)

      // Ahora sí, se habrá llamado exactamente 1 vez
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    // 2. SANITIZACIÓN DE DATOS
    it('debería limpiar espacios en blanco del email antes de enviarlo', () => {
      component.email = '  test@uma.es  ';
      component.password = '123456';
      mockAuthService.login.mockReturnValue(of({}));

      component.loginReal();

      // Verificamos que al servicio le llega el dato sanitizado
      expect(mockAuthService.login).toHaveBeenCalledWith('test@uma.es', '123456');
    });
  });

  describe('Pilar: Integración DOM y Feedback de Interfaz', () => {

    // 3. TEST DE ESTADO DE CARGA (UX)
    it('debería reflejar el estado de loading en el signal', () => {
      mockAuthService.login.mockReturnValue(of({}));

      expect(component.loading()).toBe(false);
      component.loginReal();
      expect(component.loading()).toBe(false); // Vuelve a false al terminar (next)
    });

    // 4. INTEGRACIÓN DOM: Renderizado de Errores
    it('debería mostrar físicamente el mensaje en el HTML si el signal de error cambia', () => {
      component.errorMessage.set('Error Crítico');
      fixture.detectChanges(); // Forzamos el renderizado de Angular

      const compiled = fixture.nativeElement as HTMLElement;
      const errorDiv = compiled.querySelector('.text-red-500');

      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.textContent).toContain('Error Crítico');
    });
  });

  describe('test Avanzado', () => {

    // TEST DE VALIDACIÓN DE NEGOCIO (FORMATO)
    it('debería rechazar correos con formato inválido sin llamar al servicio', () => {
      component.email = 'correo-falso-sin-arroba';
      component.password = '123456';

      component.loginReal();

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(component.errorMessage()).toContain('Formato de correo inválido');
    });

    // TEST DE MANEJO DE ERRORES (RED VS CREDENCIALES)
    it('debería mostrar error de conexión si el status es 0', () => {
      component.email = 'admin@uma.es';
      component.password = '123456';

      // Simulamos error de red (status 0)
      mockAuthService.login.mockReturnValue(throwError(() => ({ status: 0 })));

      component.loginReal();

      expect(component.errorMessage()).toContain('Sin conexión al servidor');
    });

    // TEST DE INTEGRIDAD (MEMORY LEAK / DESTROY)
    it('debería cancelar la suscripción al destruir el componente', () => {
      // Simulamos una respuesta que tarda mucho
      const authSubject = new Subject();
      mockAuthService.login.mockReturnValue(authSubject);

      component.email = 'admin@uma.es';
      component.password = '123456';
      component.loginReal();

      // Destruimos el componente antes de que llegue la respuesta
      component.ngOnDestroy();

      // Si intentamos emitir ahora, el subscribe no debería reaccionar (takeUntil)
      authSubject.next({});
      // Aquí podrías verificar que no se llamó al router.navigate
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

});
