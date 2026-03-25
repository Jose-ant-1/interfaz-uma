import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.userRole() || localStorage.getItem('userRole');

  if (role === 'ADMIN') {
    return true;
  }

  // Si no es admin, usamos navigate que es más "agresivo" que parseUrl
  router.navigate(['/dashboard/monitoreos']);
  return false;
};
