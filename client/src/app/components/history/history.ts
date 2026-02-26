import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FishingService } from '../../services/fishing';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './history.html', 
  styleUrls: ['./history.css']
})
export class HistoryComponent implements OnInit {
  
  serverUrl = 'http://localhost:5000'; 
  capturi: any[] = [];
  
  userId: number | null = null;

  constructor(
    private service: FishingService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  publishToFeed(id: number) {
    if(!confirm('Vrei să postezi această captură în Feed-ul public?')) {
      return;
    }

    this.service.publishCaptura(id).subscribe({
      next: (res) => {
        const captura = this.capturi.find(c => c.id === id);
        if (captura) {
          captura.is_public = true; 
        }
        alert('Captura a fost postată în Feed! 🌍');
      },
      error: (err) => {
        console.error(err);
        alert('Eroare la postare. Încearcă din nou.');
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const userString = localStorage.getItem('user'); 

      if (userString) {
        const user = JSON.parse(userString);
        this.userId = user.id; 
        console.log("Utilizator logat detectat ID:", this.userId);
        
        this.loadCapturi();
      } else {
        console.error("Nu ești logat! Nu pot încărca istoricul.");
      }
    }
  }

  loadCapturi() {
    if (!this.userId) return;

    this.service.getCapturiUser(this.userId).subscribe({
      next: (data: any) => {
        console.log("Capturi încărcate pentru userul", this.userId, ":", data);
        this.capturi = data;
      },
      error: (err) => console.error("Eroare la încărcare:", err)
    });
  }

  onDelete(id: number) {
    if(confirm('Sigur ștergi?')) {
        this.service.deleteCaptura(id).subscribe(() => {
            this.capturi = this.capturi.filter(c => c.id !== id);
        });
    }
  }

  // ==========================================
  // NOU: FUNCȚIE DESCHIDERE LOCAȚIE PE HARTĂ
  // ==========================================
  openMap(lat: number, lng: number) {
      if (lat && lng) {
          // Deschide Google Maps cu un pin exact pe coordonatele respective
          const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          window.open(url, '_blank');
      } else {
          alert("📍 Această captură nu are coordonate GPS salvate.");
      }
  }

  getSanitizedUrl(cale: string): SafeUrl {
    if (!cale) {
      return 'assets/placeholder.jpg'; 
    }

    let cleanPath = cale.replace(/\\/g, '/');

    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }

    if (!cleanPath.includes('uploads/')) {
        cleanPath = 'uploads/' + cleanPath;
    }

    const fullUrl = `${this.serverUrl}/${cleanPath}`;
    return this.sanitizer.bypassSecurityTrustUrl(fullUrl);
  }
}