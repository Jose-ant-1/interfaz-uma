import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { MonitoreoDetalles } from './all-monitoreo/monitoreo-detalle/monitoreo-detalle';
import { MonitoreoLista } from './all-monitoreo/componentes-monitoreo/monitoreo-lista/monitoreo-lista';
import { authGuard } from './guards/auth.guard';
import { MonitoreoEditar } from './all-monitoreo/monitoreo-editar/monitoreo-editar';
import { AdminMonitoreoListaComponent } from './all-monitoreo/admin-monitoreo-lista/admin-monitoreo-lista';
import { PerfilComponent } from './perfil/perfil';
import { PaginaListComponent } from './all-pagina/pagina-lista/pagina-lista';
import { PaginaAnyadir } from './all-pagina/pagina-anyadir/pagina-anyadir';
import { PaginaEditar } from './all-pagina/pagina-editar/pagina-editar';
import {UsuariosListComponent} from './all-usuarios/usuario-lista/usuario-lista';
import {UsuarioAnyadir} from './all-usuarios/usuario-anyadir/usuario-anyadir';
import {UsuarioEditar} from './all-usuarios/usuario-editar/usuario-editar';
import {DifusionMasiva} from './difusion-masiva/difusion-masiva';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'monitoreos', component: MonitoreoLista },
      { path: 'todos-monitoreos', component: AdminMonitoreoListaComponent },

      // CORRECCIÓN: Cambiamos AdminMonitoreoListaComponent por UsuariosListComponent
      { path: 'usuarios', component: UsuariosListComponent },

      { path: 'perfil', component: PerfilComponent },
      { path: 'monitoreo/:id', component: MonitoreoDetalles },
      { path: 'monitoreo/edit/:id', component: MonitoreoEditar },

      // Rutas para la gestión de Páginas
      { path: 'paginas', component: PaginaListComponent },
      { path: 'paginas/nueva', component: PaginaAnyadir },
      { path: 'paginas/editar/:id', component: PaginaEditar },

      // Rutas para usuarios
      { path: 'usuarios/nuevo', component: UsuarioAnyadir },
      { path: 'usuarios/editar/:id', component: UsuarioEditar },
      { path: 'difusion-masiva', component: DifusionMasiva}
    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
