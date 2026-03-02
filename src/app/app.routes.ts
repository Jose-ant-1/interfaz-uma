import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { PaginaDetalles } from './pagina-detalle/pagina-detalle';
import { PaginaLista } from './componentes-detalles-pagina/pagina-lista/pagina-lista';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Ruta 1: Login (limpia, sin sidebar)
  { path: 'login', component: Login },

  // Ruta 2: Todo lo que requiere el marco del Dashboard
  { path: 'dashboard', component: Layout, canActivate: [authGuard],
    children: [
      { path: 'paginas', component: PaginaLista },
      { path: 'pagina/:id', component: PaginaDetalles },
      { path: '', redirectTo: 'paginas', pathMatch: 'full' },
      { path: 'perfil', loadComponent: () => import('./perfil/perfil').then(m => m.PerfilComponent) }
    ]
  },
  // Redirección por defecto
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
