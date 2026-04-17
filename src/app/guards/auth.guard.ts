import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.userRole();

  // PILAR: ROBUSTEZ Y SANITIZACIÓN
  // Comprobamos que sea un string y que tenga contenido tras quitar espacios
  const hasValidRole = typeof role === 'string' && role.trim().length > 0;

  if (hasValidRole) {
    return true;
  }

  return router.parseUrl('/login');
};
