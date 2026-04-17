import {environment} from './environment';
import {HttpInterceptorFn} from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authData = localStorage.getItem('authData');

  // PILAR: ROBUSTEZ - Normalización de URL
  let fullUrl = req.url;
  if (!req.url.startsWith('http')) {
    const cleanPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    fullUrl = `${environment.apiUrl}/${cleanPath}`;
  }

  const headers: { [key: string]: string } = {};

  // PILAR: SANITIZACIÓN - Limpieza de Token
  if (authData && authData.trim().length > 0) {
    headers['Authorization'] = authData.trim();
  }

  const clonedRequest = req.clone({
    url: fullUrl,
    setHeaders: headers
  });

  // PILAR: MANEJO DE ERRORES - Dejamos que el flujo continúe
  return next(clonedRequest);
};
