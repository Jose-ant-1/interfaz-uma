import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Guard revisando rol:', authService.userRole());

  if (authService.userRole()) {
    return true;
  }
  console.warn('Guard: No autenticado, redirigiendo...');
  return router.parseUrl('/login');
}
