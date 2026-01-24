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

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'istoric', component: HistoryComponent },
  { path: 'feed', component: FeedComponent },
  { path: 'adauga', component: AddCatchComponent },
  { path: 'edit-catch/:id', component: EditCatch },
  { path: 'profil', component: ProfilComponent },
  { path: 'harta', component: Map },
  { path: 'calendar', component: CalendarComponent }
];