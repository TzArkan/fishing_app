import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './messages.html',
  styleUrls: ['./messages.css']
})
export class MessagesComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  myId: number = 0;
  conversations: any[] = []; 
  searchResults: any[] = []; 
  
  selectedUser: any = null; 
  currentMessages: any[] = []; 
  newMessage: string = '';
  searchQuery: string = '';
  
  isSearching: boolean = false;

  constructor(private service: FishingService, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
            const userObj = JSON.parse(userStr);
            // ⚠️ FIX: Forțăm conversia la număr
            this.myId = Number(userObj.id); 
            console.log("ID-ul meu este:", this.myId); // Verifică consola (F12)
        } catch (e) {
            console.error("Eroare la parse user:", e);
        }
        
        this.loadConversations();
      }
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if(this.myScrollContainer) {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  loadConversations() {
    this.service.getActiveConversations(this.myId).subscribe(res => {
      this.conversations = res;
    });
  }

  onSearch() {
    if (this.searchQuery.length > 2) {
      this.isSearching = true;
      this.service.searchUsers(this.searchQuery).subscribe(res => {
        // Filtrăm să nu ne găsim pe noi înșine în căutare
        this.searchResults = res.filter((u: any) => u.id != this.myId);
      });
    } else {
      this.isSearching = false;
      this.searchResults = [];
    }
  }

  selectUser(user: any) {
    this.selectedUser = {
      id: user.partner_id || user.id, 
      nume: user.nume,
      avatar_url: user.avatar_url
    };
    
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = []; // Curățăm rezultatele
    
    this.loadMessages();
  }

  loadMessages() {
    if (!this.selectedUser) return;
    this.service.getMessages(this.myId, this.selectedUser.id).subscribe(res => {
      this.currentMessages = res;
      // Debug: Vedem ce ID-uri vin de la server
      if(res.length > 0) {
          console.log("Mesaj exemplu - Sender ID:", res[res.length-1].sender_id, "Tip:", typeof res[res.length-1].sender_id);
      }
      this.scrollToBottom();
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedUser) return;

    this.service.sendMessage(this.myId, this.selectedUser.id, this.newMessage).subscribe((msg) => {
      this.currentMessages.push(msg);
      this.newMessage = '';
      this.scrollToBottom();
      this.loadConversations(); 
    });
  }
}