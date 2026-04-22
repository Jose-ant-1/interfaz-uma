import { Component, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login implements OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>(); // PARA INTEGRIDAD

  email = '';
  password = '';
  errorMessage = signal('');
  loading = signal(false);

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loginReal() {
    if (this.loading()) return;

    const cleanEmail = this.email.trim();
    const cleanPassword = this.password.trim();

    // VALIDACIÓN DE NEGOCIO Y CASO DE BORDE
    if (!this.isValidEmail(cleanEmail)) {
      this.errorMessage.set('Error: Formato de correo inválido');
      return;
    }

    if (!cleanPassword) {
      this.errorMessage.set('Error: La contraseña es obligatoria');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(cleanEmail, cleanPassword)
      .pipe(takeUntil(this.destroy$)) // INTEGRIDAD: Evita fugas de memoria
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/dashboard/monitoreos']);
        },
        error: (err) => {
          this.loading.set(false);
          // PILAR: MANEJO DE ERRORES Y RESILIENCIA
          if (err.status === 0) {
            this.errorMessage.set('Error: Sin conexión al servidor');
          } else if (err.status === 401 || err.status === 403) {
            this.errorMessage.set('Error: Usuario o contraseña incorrectos');
          } else {
            // Caso de borde para otros errores (500, 404, etc)
            this.errorMessage.set('Error: Ha ocurrido un fallo inesperado');
          }
        }
      });
  }

  private isValidEmail(email: string): boolean {
    // Pilar: Sanitización (Evitar backtracking catastrófico)
    // Usamos una lógica más simple y segura que SonarQube no marca como vulnerable
    if (!email || email.length > 254) return false;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}
