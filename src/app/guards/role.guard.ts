import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Comprobamos si el rol es exactamente ADMIN
  if (authService.userRole() === 'ADMIN') {
    return true;
  }

  // Si no es ADMIN, lo redirigimos al dashboard general
  console.warn('Acceso denegado: Se requiere rol ADMIN');
  return router.parseUrl('/dashboard/monitoreos');
};
