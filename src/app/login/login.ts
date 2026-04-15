import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  email = '';
  password = '';
  errorMessage = signal('');

  loginReal() {
    // Limpiamos el error antes de empezar
    this.errorMessage.set('');

    this.authService.login(this.email, this.password).subscribe({
      next: () => void this.router.navigate(['/dashboard/monitoreos']),
      error: () => this.errorMessage.set('Error: Usuario o contraseña incorrectos')
    });
  }

}
