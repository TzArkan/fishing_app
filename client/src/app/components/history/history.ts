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
  
  // ⚠️ SCHIMBARE: Nu mai punem 1 hardcodat. Îl lăsăm null la început.
  userId: number | null = null;

  constructor(
    private service: FishingService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // ⚠️ AICI E REPARAȚIA: Aflăm cine e logat cu adevărat
      const userString = localStorage.getItem('user'); // Verifică dacă cheia ta de login e 'user' sau 'currentUser'

      if (userString) {
        const user = JSON.parse(userString);
        this.userId = user.id; // Luăm ID-ul real al utilizatorului
        console.log("Utilizator logat detectat ID:", this.userId);
        
        // Abia acum încărcăm capturile
        this.loadCapturi();
      } else {
        console.error("Nu ești logat! Nu pot încărca istoricul.");
        // Aici ai putea să îi dai redirect către login
      }
    }
  }

  loadCapturi() {
    // Verificăm să avem un ID valid înainte să sunăm la server
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