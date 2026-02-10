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

export const routes: Routes = [
  // --- RUTE PUBLICE (Oricine le poate accesa) ---
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'resetare-parola', component: ForgotPasswordComponent },

  // --- RUTE PROTEJATE (Doar utilizatorii logați pot intra) ---
  { 
    path: 'feed', 
    component: FeedComponent, 
    canActivate: [authGuard] // <--- Aici intervine gardianul
  },
  { 
    path: 'istoric', 
    component: HistoryComponent, 
    canActivate: [authGuard] 
  },
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