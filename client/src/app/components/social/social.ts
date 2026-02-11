import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FishingService } from '../../services/fishing';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, RouterModule,FormsModule],
  templateUrl: './social.html',
  styleUrls: ['./social.css']
})
export class SocialComponent implements OnInit {
  myId: number = 0;
  
  // Listele de date
  incomingRequests: any[] = [];
  sentRequests: any[] = [];    // <--- LISTA PENTRU CERERI TRIMISE
  friendsList: any[] = [];     // <--- LISTA PENTRU PRIETENI
  suggestions: any[] = [];
searchQuery: string = '';
searchResults: any[] = [];

// Adaugă funcția de search (aceeași logică ca la mesaje)
onSearch() {
  if (this.searchQuery.length > 2) {
    this.service.searchUsers(this.searchQuery).subscribe(res => {
      // Filtrăm userul curent și prietenii existenți opțional, 
      // dar backend-ul returnează tot ce găsește cu numele ala.
      this.searchResults = res.filter(u => u.id !== this.myId);
    });
  } else {
    this.searchResults = [];
  }
}
  constructor(
    private service: FishingService, 
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
            const userObj = JSON.parse(userStr);
            this.myId = userObj.id;
        } catch {
            this.myId = +userStr;
        }
        this.loadAll();
      }
    }
  }

  loadAll() {
    // 1. Cereri Primite
    this.service.getIncomingRequests(this.myId).subscribe({
        next: (res) => this.incomingRequests = res,
        error: (err) => console.error("Eroare incoming:", err)
    });

    // 2. Cereri Trimise (AICI E CHEIA CA SĂ LE VEZI DUPĂ CE LE TRIMITI)
    this.service.getSentRequests(this.myId).subscribe({
        next: (res) => this.sentRequests = res,
        error: (err) => console.error("Eroare sent:", err)
    });

    // 3. Prieteni
    this.service.getFriendsList(this.myId).subscribe({
        next: (res) => this.friendsList = res,
        error: (err) => console.error("Eroare friends:", err)
    });

    // 4. Sugestii
    this.service.getSuggestions(this.myId).subscribe({
        next: (res) => this.suggestions = res,
        error: (err) => console.error("Eroare suggestions:", err)
    });
  }

  handleRequest(fId: number, status: 'accepted' | 'declined') {
    this.service.respondToRequest(fId, status).subscribe(() => {
        this.loadAll(); 
    });
  }

  // Funcție pentru anularea unei cereri trimise
  cancelRequest(fId: number) {
      if(confirm("Anulezi cererea?")) {
        this.service.cancelRequest(fId).subscribe(() => {
            this.loadAll(); // Reîncărcăm lista ca să dispară
        });
      }
  }

  sendFriendRequest(userId: number) {
    if (!userId) return;

    this.service.sendFriendRequest(this.myId, userId).subscribe({
        next: () => {
            // Nu mai dăm alert, doar reîncărcăm listele.
            // Userul va dispărea de la sugestii și va apărea la "Cereri Trimise"
            this.loadAll(); 
        },
        error: (err) => alert("Eroare la trimitere.")
    });
  }
}