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

  cargandoLogout = signal(false);

  toggleMenu() {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu() {
    this.menuAbierto.set(false);
  }

  cerrarSesion() {
    // PILAR: PROTECCIÓN DE ENVÍO (Antirebote)
    if (this.cargandoLogout()) return;

    this.cargandoLogout.set(true);

    try {
      // PILAR: INTEGRIDAD DE FLUJO
      this.authService.logout();
      // Forzamos el cierre del menú por si acaso antes de irnos
      this.cerrarMenu();

      void this.router.navigate(['/login']).then(() => {
        this.cargandoLogout.set(false);
      });
    } catch (error) {
      // PILAR: MANEJO DE ERRORES Y RESILIENCIA
      // Incluso si el logout falla (ej. error borrando cookies),
      // la prioridad de negocio es sacar al usuario a la pantalla de login
      console.error('Error durante el cierre de sesión:', error);
      void this.router.navigate(['/login']);
      this.cargandoLogout.set(false);
    }
  }
}
