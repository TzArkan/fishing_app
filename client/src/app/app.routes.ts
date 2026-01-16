import { Routes } from '@angular/router';
import { AddCatchComponent } from './components/add-catch/add-catch'; 
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { HistoryComponent } from './components/history/history';
import { ProfilComponent } from './components/profil/profil'; 
import { EditCatch } from './edit-catch/edit-catch';
import { FeedComponent } from './components/feed/feed';

export const routes: Routes = [
  // 1. Când intri pe site, te duce la Login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  
  // 2. Rutele de Auth
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'istoric', component: HistoryComponent },
  { path: 'feed', component: FeedComponent },
  // 3. Ruta principală (doar după logare ajungi aici)
  { path: 'adauga', component: AddCatchComponent },
  { path: 'edit-catch/:id', component: EditCatch },
  { path: 'profil', component: ProfilComponent }
];