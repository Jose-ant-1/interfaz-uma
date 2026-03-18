import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authData = localStorage.getItem('authData');

  // SOLO añadimos el header si la URL incluye 'localhost:8080' (tu API)
  // Así evitamos enviar tus contraseñas a páginas externas y evitamos problemas CORS
  if (authData && req.url.includes('localhost:8080')) {
    const cloned = req.clone({
      setHeaders: { Authorization: authData }
    });
    return next(cloned);
  }

  return next(req);
};
