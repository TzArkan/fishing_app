import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css']
})
export class UserProfileComponent implements OnInit {
  
  profileId: number = 0;
  myId: number = 0;
  
  userData: any = null; // Userul pe care îl vizităm
  capturi: any[] = [];
  friendStatus: string = 'none'; // 'none', 'pending', 'accepted'
  isRequester: boolean = false; // Dacă eu am trimis cererea

  // CHAT
  showChat: boolean = false;
  messages: any[] = [];
  newMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private service: FishingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // 1. Aflăm ID-ul din URL (profilul cui îl vedem?)
    this.route.params.subscribe(params => {
        this.profileId = +params['id'];
        this.loadProfile();
    });

    // 2. Aflăm cine sunt eu
    if (isPlatformBrowser(this.platformId)) {
        const stored = localStorage.getItem('userId');
        if (stored) this.myId = +stored;
    }
  }

loadProfile() {
    console.log("1. START: Încerc să încarc profilul ID:", this.profileId);

    if (!this.profileId) {
        console.error("❌ EROARE: ID-ul profilului este 0 sau invalid!");
        return;
    }

    this.service.getPublicProfile(this.profileId).subscribe({
      next: (data: any) => {
        console.log("2. RĂSPUNS SERVER:", data); // <--- AICI E CHEIA

        if (data) {
            this.userData = data;
            this.capturi = data.capturi || [];
            
            if (this.myId && this.myId !== this.profileId) {
                this.checkFriendship();
            }
        } else {
            console.warn("⚠️ Serverul a răspuns cu NULL! Userul nu există în baza de date.");
        }
      },
      error: (err) => {
        console.error("3. EROARE HTTP:", err);
      }
    });
  }
  // Adaugă această funcție în clasa UserProfileComponent
unfriendUser() {
    if (confirm(`Ești sigur că vrei să ștergi prietenia cu ${this.userData.user.nume}?`)) {
        this.service.removeFriend(this.myId, this.profileId).subscribe(() => {
            alert('Prietenia a fost ștearsă.');
            this.friendStatus = 'none'; // Actualizăm interfața instant
            this.isRequester = false;
        });
    }
}

  checkFriendship() {
      this.service.checkFriendStatus(this.myId, this.profileId).subscribe((res: any) => {
          if (res.status === 'none') {
              this.friendStatus = 'none';
          } else {
              this.friendStatus = res.status;
              // Verificăm cine a inițiat cererea
              this.isRequester = (res.requester_id === this.myId);
          }
      });
  }

  sendRequest() {
      this.service.sendFriendRequest(this.myId, this.profileId).subscribe(() => {
          this.friendStatus = 'pending';
          this.isRequester = true;
      });
  }

  acceptRequest() {
      // Dacă eu accept, înseamnă că celălalt (profileId) a fost requester
      this.service.acceptFriendRequest(this.profileId, this.myId).subscribe(() => {
          this.friendStatus = 'accepted';
      });
  }

  // --- LOGICA CHAT ---
  toggleChat() {
      this.showChat = !this.showChat;
      if (this.showChat) {
          this.loadMessages();
          // Polling simplu: reîncarcă mesajele la fiecare 3 secunde cât timp chatul e deschis
          // (Într-o aplicație reală am folosi WebSockets, dar asta e suficient pt acum)
          // setInterval(() => this.loadMessages(), 3000); 
      }
  }

  loadMessages() {
      this.service.getMessages(this.myId, this.profileId).subscribe((msgs: any) => {
          this.messages = msgs;
          // Auto-scroll jos
          setTimeout(() => {
             const chatBody = document.querySelector('.chat-body');
             if(chatBody) chatBody.scrollTop = chatBody.scrollHeight;
          }, 100);
      });
  }

  sendMessage() {
      if (!this.newMessage.trim()) return;
      this.service.sendMessage(this.myId, this.profileId, this.newMessage).subscribe((msg: any) => {
          this.messages.push(msg);
          this.newMessage = '';
          // Scroll jos
          setTimeout(() => {
             const chatBody = document.querySelector('.chat-body');
             if(chatBody) chatBody.scrollTop = chatBody.scrollHeight;
          }, 100);
      });
  }
}