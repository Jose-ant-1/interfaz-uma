import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { PaginaDetalles } from './pagina-detalle/pagina-detalle';
import { MonitoreoLista } from './componentes-monitoreo/monitoreo-lista/monitoreo-lista';
import { authGuard } from './guards/auth.guard';
import {PaginaEditar} from './pagina-editar/pagina-editar';

export const routes: Routes = [
  // Ruta 1: Login (limpia, sin sidebar)
  { path: 'login', component: Login },

  // Ruta 2: Todo lo que requiere el marco del Dashboard
  { path: 'dashboard', component: Layout, canActivate: [authGuard],
    children: [
      { path: 'paginas', component: MonitoreoLista },
      { path: 'pagina/:id', component: PaginaDetalles },
      { path: '', redirectTo: 'paginas', pathMatch: 'full' },
      { path: 'perfil', loadComponent: () => import('./perfil/perfil').then(m => m.PerfilComponent) },
      { path: 'pagina/edit/:id', component: PaginaEditar }
    ]
  },
  // Redirección por defecto
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
