import { Routes } from '@angular/router';
import { AddCatchComponent } from './components/add-catch/add-catch'; 
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { HistoryComponent } from './components/history/history';
import { ProfilComponent } from './components/profil/profil'; 
import { EditCatch } from './edit-catch/edit-catch';
import { FeedComponent } from './components/feed/feed';
import { Map } from './components/map/map';
import { CalendarComponent} from './components/calendar/calendar';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { authGuard } from './guards/auth-guard';
import { EncyclopediaComponent } from './components/encyclopedia/encyclopedia';
import { LegislationComponent } from './components/legislation/legislation';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'resetare-parola', component: ForgotPasswordComponent },

  { 
    path: 'feed', 
    component: FeedComponent, 
    canActivate: [authGuard] 
  },
  { path: 'legislatie', component: LegislationComponent },
  { 
    path: 'istoric', 
    component: HistoryComponent, 
    canActivate: [authGuard] 
  },
  { path: 'admin', component: AdminDashboardComponent },
  { 
    path: 'adauga', 
    component: AddCatchComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'edit-catch/:id', 
    component: EditCatch, 
    canActivate: [authGuard] 
  },
  { 
    path: 'profil', 
    component: ProfilComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'harta', 
    component: Map, 
    canActivate: [authGuard] 
  },
  { path: 'enciclopedie', component: EncyclopediaComponent, canActivate: [authGuard] },
  { 
    path: 'calendar', 
    component: CalendarComponent, 
    canActivate: [authGuard] 
  }
];