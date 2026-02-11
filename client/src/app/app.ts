import { Component, Inject, PLATFORM_ID } from '@angular/core'; // <--- IMPORTĂ Inject, PLATFORM_ID
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router'; 
import { CommonModule, isPlatformBrowser } from '@angular/common'; // <--- IMPORTĂ isPlatformBrowser

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterLink], 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Fishing App';
  showMenu: boolean = true;
  currentUser: any = null;
  showSettingsMenu: boolean = false;
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // <--- INJECTĂM ID-UL PLATFORMEI
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.urlAfterRedirects;
        
        if (currentUrl.includes('/login') || currentUrl.includes('/register') || currentUrl.includes('/resetare-parola') || currentUrl === '/') {
           this.showMenu = false;
        } else {
           this.showMenu = true;
        }

        // 👇 SOLUȚIA: Executăm asta DOAR dacă suntem în browser
        if (isPlatformBrowser(this.platformId)) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              this.currentUser = JSON.parse(userStr);
            } else {
              this.currentUser = null;
            }
        }
      }
    });
  }
  toggleSettings() {
    this.showSettingsMenu = !this.showSettingsMenu;
  }

 logout() {
    this.showSettingsMenu = false; // Ascundem meniul
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
    }
    this.currentUser = null;
    this.router.navigate(['/login']);
  }
}