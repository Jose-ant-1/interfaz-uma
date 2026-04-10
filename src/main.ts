import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

try {
  // Usamos await directamente en la raíz del archivo
  await bootstrapApplication(App, appConfig);
} catch (err) {
  // Capturamos el error de inicialización aquí
  console.error(err);
}
