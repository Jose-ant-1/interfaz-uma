import { Component, inject } from '@angular/core';
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

  // Signals conectadas al servicio
  userRole = this.authService.userRole;
  username = this.authService.userName;

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
