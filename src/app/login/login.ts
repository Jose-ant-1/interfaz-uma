import { Component, inject } from '@angular/core';
import { Router } from '@angular/router'; // 1. Importar el Router

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
})
export class Login {
  // 2. Inyectar el Router
  private router = inject(Router);

  // 3. Crear la función temporal
  loginTemporal() {
    // Simplemente navegamos a la ruta que tengas configurada para el dashboard
    this.router.navigate(['/dashboard']);
  }
}
