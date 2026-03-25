import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from './environment'; // Importamos el que acabas de crear

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authData = localStorage.getItem('authData');

  // Preparamos la URL
  const secureUrl = req.url.startsWith('http')
    ? req.url
    : `${environment.apiUrl}${req.url.startsWith('/') ? '' : '/'}${req.url}`;

  // Clonamos la petición con la nueva URL y el header de auth
  let clonedRequest = req.clone({ url: secureUrl });

  if (authData) {
    clonedRequest = clonedRequest.clone({
      setHeaders: {
        Authorization: authData
      }
    });
  }

  return next(clonedRequest);
};
