import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { PaginaLista } from './componentes-detalles-pagina/pagina-lista/pagina-lista';

export const routes: Routes = [
  // Ruta 1: Login (limpia, sin sidebar)
  { path: 'login', component: Login },

  // Ruta 2: Todo lo que requiere el marco del Dashboard
  {
    path: 'dashboard',
    component: Layout,
    children: [
      { path: 'paginas', component: PaginaLista },
      // Aquí irían más como { path: 'perfil', component: PerfilComponent }
      { path: '', redirectTo: 'paginas', pathMatch: 'full' }
    ]
  },

  // Redirección por defecto
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
