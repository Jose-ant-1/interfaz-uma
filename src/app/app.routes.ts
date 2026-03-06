import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { MonitoreoDetalles } from './monitoreo-detalle/monitoreo-detalle';
import { MonitoreoLista } from './componentes-monitoreo/monitoreo-lista/monitoreo-lista';
import { authGuard } from './guards/auth.guard';
import { MonitoreoEditar } from './monitoreo-editar/monitoreo-editar';
import { AdminMonitoreoListaComponent } from './admin-monitoreo-lista/admin-monitoreo-lista';
import { PerfilComponent } from './perfil/perfil';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'monitoreos', component: MonitoreoLista },
      { path: 'todos-monitoreos', component: AdminMonitoreoListaComponent },
      { path: 'usuarios', component: AdminMonitoreoListaComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'monitoreo/:id', component: MonitoreoDetalles },
      // IMPORTANTE: Solo una vez y con este nombre
      { path: 'monitoreo/edit/:id', component: MonitoreoEditar },

      { path: '', redirectTo: 'monitoreos', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
