import { Routes } from '@angular/router';
// Las rutas importarán los componentes conforme los vayas creando en el siguiente paso
import { MobileRemoteComponent } from './features/mobile-remote/mobile-remote.component';
import { TvPlayerComponent } from './features/tv-player/tv-player.component';
import { AdminPanelComponent } from './features/admin-panel/admin-panel.component';

export const routes: Routes = [
  { path: 'mobile', component: MobileRemoteComponent },
  { path: 'tv', component: TvPlayerComponent },
  { path: 'admin', component: AdminPanelComponent },
  { path: '', redirectTo: 'mobile', pathMatch: 'full' }
];
