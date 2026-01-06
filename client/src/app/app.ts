import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router'; // Importăm Router
import { CommonModule } from '@angular/common'; // Importăm CommonModule pentru directive

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule], // Adăugăm CommonModule
  templateUrl: './app.html',
  styleUrl: './app.css' // Atenție: poate fi styleUrl sau styleUrls
})
export class App {
  title = 'Fishing App';
  showMenu: boolean = true; // Variabila care decide dacă arătăm meniul

  constructor(private router: Router) {
    // Ne abonăm la evenimentele de navigare
    this.router.events.subscribe((event) => {
      // Verificăm doar când navigarea s-a terminat
      if (event instanceof NavigationEnd) {
        // Dacă suntem pe pagina de login sau register, ascundem meniul
        const currentUrl = event.urlAfterRedirects; // url-ul curent
        
        if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
           this.showMenu = false;
        } else {
           this.showMenu = true;
        }
      }
    });
  }

  // Funcție de Logout (o folosim imediat în HTML)
  logout() {
    // Ștergem userul din memorie
    localStorage.removeItem('user');
    // Îl trimitem la login
    this.router.navigate(['/login']);
  }
}