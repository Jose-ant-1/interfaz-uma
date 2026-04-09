import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from './environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authData = localStorage.getItem('authData');

  // Extraemos la lógica de la URL a una variable independiente
  let fullUrl = req.url;

  if (!req.url.startsWith('http')) {
    // Si no es una URL absoluta, añadimos el prefijo del environment
    const separator = req.url.startsWith('/') ? '' : '/';
    fullUrl = `${environment.apiUrl}${separator}${req.url}`;
  }

  // Clonamos la petición una sola vez con la URL y los headers
  const headers: { [key: string]: string } = {};

  if (authData) {
    headers['Authorization'] = authData;
  }

  const clonedRequest = req.clone({
    url: fullUrl,
    setHeaders: headers
  });

  return next(clonedRequest);
};
