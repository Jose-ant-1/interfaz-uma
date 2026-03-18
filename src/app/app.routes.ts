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
import {DifusionMasiva} from './all-difusion/difusion-masiva/difusion-masiva';
import {PlantMonitoreoAnyadir} from './all-difusion/all-plant-monitoreo/plant-monitoreo-anyadir/plant-monitoreo-anyadir';
import {PlantMonitoreoLista} from './all-difusion/all-plant-monitoreo/plant-monitoreo-lista/plant-monitoreo-lista';
import {PlantMonitoreoEditar} from './all-difusion/all-plant-monitoreo/plant-monitoreo-editar/plant-monitoreo-editar';
import {PlantUsuarioLista} from './all-difusion/all-plant-usuario/plant-usuario-lista/plant-usuario-lista';
import {PlantUsuarioAnyadir} from './all-difusion/all-plant-usuario/plant-usuario-anyadir/plant-usuario-anyadir';
import {PlantUsuarioEditar} from './all-difusion/all-plant-usuario/plant-usuario-editar/plant-usuario-editar';
import {MonitoreoAnyadir} from './all-monitoreo/monitoreo-anyadir/monitoreo-anyadir';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Layout,
    canActivate: [authGuard],
    children: [
      // monitoreos
      { path: 'monitoreos', component: MonitoreoLista },
      { path: 'todos-monitoreos', component: AdminMonitoreoListaComponent },
      { path: 'monitoreos/nuevo', component: MonitoreoAnyadir },
      { path: 'monitoreo/:id', component: MonitoreoDetalles },
      { path: 'monitoreo/edit/:id', component: MonitoreoEditar },

      // usuarios
      { path: 'usuarios', component: UsuariosListComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'usuarios/nuevo', component: UsuarioAnyadir },
      { path: 'usuarios/editar/:id', component: UsuarioEditar },

      // Páginas
      { path: 'paginas', component: PaginaListComponent },
      { path: 'paginas/nueva', component: PaginaAnyadir },
      { path: 'paginas/editar/:id', component: PaginaEditar },

      // Difusión
      { path: 'difusion-masiva', component: DifusionMasiva},

      // plantillaMonitoreo
      { path: 'difusion/nueva-plantilla', component: PlantMonitoreoAnyadir },
      { path: 'difusion/administrar-plantillas', component: PlantMonitoreoLista },
      { path: 'difusion/editar-plantilla/:id', component: PlantMonitoreoEditar },

      // plantillaUsuario
      { path: 'difusion/administrar-grupos', component: PlantUsuarioLista },
      { path: 'difusion/nuevo-grupo', component: PlantUsuarioAnyadir },
      { path: 'difusion/editar-grupo/:id', component: PlantUsuarioEditar },

    ]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
