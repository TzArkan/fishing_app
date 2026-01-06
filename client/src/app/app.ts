import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router'; // <--- 1. IMPORTĂ AICI RouterLink
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  // 2. ADAUGĂ RouterLink MAI JOS ÎN LISTA DE IMPORTS
  imports: [RouterOutlet, CommonModule, RouterLink], 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Fishing App';
  showMenu: boolean = true;

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.urlAfterRedirects;
        // Ascunde meniul pe paginile de login/register
        if (currentUrl.includes('/login') || currentUrl.includes('/register') || currentUrl === '/') {
           this.showMenu = false;
        } else {
           this.showMenu = true;
        }
      }
    });
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}