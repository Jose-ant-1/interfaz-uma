import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authData = localStorage.getItem('authData');

  // Si el usuario ya se logueó, pegamos su "pasaporte" en cada petición
  if (authData) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: authData
      }
    });
    return next(cloned);
  }

  return next(req);
};
