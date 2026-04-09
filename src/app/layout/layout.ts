import {Component, inject, computed, signal, HostListener} from '@angular/core';
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.menuAbierto()) {
      this.cerrarMenu();
    }
  }

  userName = this.authService.userName;
  userRole = this.authService.userRole;

  // Helper para el @if (esAdmin())
  esAdmin = computed(() => this.authService.userRole() === 'ADMIN');

  menuAbierto = signal(false);

  toggleMenu() {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
