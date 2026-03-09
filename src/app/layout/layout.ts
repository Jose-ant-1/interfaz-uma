import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html'
})
export class Layout {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Exponemos las señales del servicio para el HTML
  userName = this.authService.userName;
  userRole = this.authService.userRole;

  // Helper para el @if (esAdmin())
  esAdmin = computed(() => this.authService.userRole() === 'ADMIN');

  cerrarSesion() {
    this.authService.logout(); //
    this.router.navigate(['/login']);
  }
}
