import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Layout } from './layout/layout';
import { PaginaDetalles } from './monitoreo-detalle/monitoreo-detalle';
import { MonitoreoLista } from './componentes-monitoreo/monitoreo-lista/monitoreo-lista';
import { authGuard } from './guards/auth.guard';
import { PaginaEditar } from './pagina-editar/pagina-editar';
import { AdminMonitoreoListaComponent } from './admin-monitoreo-lista/admin-monitoreo-lista';
import { PerfilComponent } from './perfil/perfil';

export const routes: Routes = [
    { path: 'login', component: Login },

    {
      path: 'dashboard',
      component: Layout,
      canActivate: [authGuard],
      children: [
        // 1. Ruta principal del dashboard (Mis monitoreos)
        { path: 'monitoreos', component: MonitoreoLista },

        // 2. Ruta para ADMIN (La que te daba error)
        { path: 'todos-monitoreos', component: AdminMonitoreoListaComponent },

        // 3. Gestión de usuarios (puedes dejar el componente vacío por ahora o usar el mismo para probar)
        { path: 'usuarios', component: AdminMonitoreoListaComponent },

        // 4. Perfil y detalles
        { path: 'perfil', component: PerfilComponent },
        { path: 'monitoreo/:id', component: PaginaDetalles },
        { path: 'monitoreo/edit/:id', component: PaginaEditar },

        // Redirección por defecto dentro del dashboard
        { path: '', redirectTo: 'monitoreos', pathMatch: 'full' }
      ]
    },

    // Ruta raíz: al login
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    // Comodín para rutas no encontradas
    { path: '**', redirectTo: 'login' }
  ];
