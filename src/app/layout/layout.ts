import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html'
})
export class Layout {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals del servicio
  userRole = this.authService.userRole;
  userName = this.authService.userName;

  // Lógica centralizada: un solo booleano para todo el HTML
  esAdmin = computed(() => this.userRole() === 'ADMIN');

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
