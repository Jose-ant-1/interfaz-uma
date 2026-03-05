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
  private router = inject(Router);
  private authService = inject(AuthService);

  email = '';
  password = '';
  errorMessage = signal('');

  loginReal() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard/monitoreos']),
      error: () => this.errorMessage.set('Error: Usuario o contraseña incorrectos')
    });
  }

}
