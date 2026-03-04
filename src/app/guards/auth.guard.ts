import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si userRole() tiene valor (ADMIN o USER), le dejamos pasar
  if (authService.userRole()) {
    return true;
  }

  // Si es null, al login de cabeza
  return router.parseUrl('/login');
}
