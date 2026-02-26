import { Component, Inject, PLATFORM_ID } from '@angular/core'; 
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router'; 
import { CommonModule, isPlatformBrowser } from '@angular/common'; 

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

  // --- STAREA PENTRU MENIUL DE MOBIL ---
  isMobileMenuOpen: boolean = false;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const currentUrl = event.urlAfterRedirects;
        
        if (currentUrl.includes('/login') || currentUrl.includes('/register') || currentUrl.includes('/resetare-parola') || currentUrl === '/') {
           this.showMenu = false;
        } else {
           this.showMenu = true;
        }

        if (isPlatformBrowser(this.platformId)) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              this.currentUser = JSON.parse(userStr);
            } else {
              this.currentUser = null;
            }
        }
        
        // Închidem meniul automat când navigăm pe o altă pagină
        this.isMobileMenuOpen = false;
        this.showSettingsMenu = false; 
      }
    });
  }

  // --- FUNCȚII PENTRU MENIUL DE MOBIL ȘI SETĂRI ---
  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Dacă deschidem meniul principal, ascundem setările ca să nu se suprapună
    if (this.isMobileMenuOpen) {
      this.showSettingsMenu = false;
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  toggleSettings() {
    this.showSettingsMenu = !this.showSettingsMenu;
    // Dacă deschidem setările, ascundem meniul principal pe mobil
    if (this.showSettingsMenu) {
      this.isMobileMenuOpen = false;
    }
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