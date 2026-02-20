import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authData = localStorage.getItem('authData');

  if (authData) {
    const cloned = req.clone({
      setHeaders: { Authorization: authData }
    });
    return next(cloned);
  }

  return next(req);
};
