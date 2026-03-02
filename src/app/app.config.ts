import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'; // <-- Cambia esto
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import { authInterceptor } from './auth.interceptor'; // Importa el interceptor

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), // <-- Usa esta función
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]),
    )
  ]
};
