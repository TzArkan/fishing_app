import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FishingService } from '../../services/fishing';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feed.html',
  styleUrls: ['./feed.css']
})
export class FeedComponent implements OnInit {
  posts: any[] = [];
  serverUrl = 'http://localhost:5000'; 
  
  // Aici ținem ID-ul, exact ca în history.ts
  currentUserId: number | null = null; 
  currentUser: any = null; // Obiectul complet user (pentru a verifica rolul)

  constructor(
    private service: FishingService, 
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit() {
    this.loadCurrentUser(); // Citim userul înainte să încărcăm feed-ul
    
    // Citim și obiectul complet pentru a verifica rolul de admin
    if (isPlatformBrowser(this.platformId)) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
        }
    }

    this.loadFeed();
  }

  // --- LOGICA TA DIN HISTORY APLICATĂ AICI ---
  loadCurrentUser() {
    if (isPlatformBrowser(this.platformId)) {
      const userString = localStorage.getItem('user'); // Luăm obiectul întreg

      if (userString) {
        try {
          const user = JSON.parse(userString);
          this.currentUserId = user.id; // Extragem ID-ul din obiect
          console.log("Feed: ID detectat din obiectul user:", this.currentUserId);
        } catch (e) {
          console.error("Eroare la citire user:", e);
        }
      }
    }
  }
  
  loadFeed() {
    this.service.getFeed().subscribe({
      next: (data: any) => {
        console.log('Feed data:', data);
        this.posts = data.map((post: any) => ({
          ...post,
          newCommentText: '', 
          showComments: false 
        }));
      },
      error: (err) => console.error(err)
    });
  }

  // --- LIKE: Folosim this.currentUserId setat mai sus ---
  toggleLike(post: any) {
    // Dacă vrei siguranță maximă (în caz că s-a schimbat userul între timp), recitim ID-ul
    this.loadCurrentUser(); 

    if (!this.currentUserId) {
        alert("Trebuie să fii logat pentru a da like!");
        return;
    }

    const isLiked = post.liked_by_current_user;
    // Optimistic UI update
    post.liked_by_current_user = !isLiked;
    post.likes_count += !isLiked ? 1 : -1;

    this.service.toggleLike(post.id, this.currentUserId).subscribe({
      error: () => {
        // Revert dacă e eroare
        post.liked_by_current_user = isLiked;
        post.likes_count += isLiked ? 1 : -1;
        alert("Eroare la like.");
      }
    });
  }

  // --- COMENTARIU ---
  submitComment(post: any) {
    this.loadCurrentUser(); // Recitim ca să fim siguri

    if (!this.currentUserId) {
        alert("Trebuie să fii logat pentru a comenta!");
        return;
    }

    if (!post.newCommentText || !post.newCommentText.trim()) return;

    const text = post.newCommentText;
    
    // Luăm și numele tot din obiectul 'user', ca să nu apară "Eu"
    let currentUserName = 'Eu';
    if (isPlatformBrowser(this.platformId)) {
        const userString = localStorage.getItem('user');
        if (userString) {
            const u = JSON.parse(userString);
            currentUserName = u.nume || 'Eu';
        }
    }

    this.service.addComment(post.id, this.currentUserId, text).subscribe({
      next: (newComment: any) => {
        if (!post.comments) post.comments = [];
        
        // Dacă backend-ul returnează comentariul, îl folosim
        // Altfel, construim unul local pentru afișare rapidă
        post.comments.push({
          ...newComment, // presupunem că backend-ul returnează tot obiectul
          user_name: currentUserName, 
          // user_avatar: ... (dacă ai avatarul userului curent îl poți pune aici)
          created_at: new Date()
        });
        
        post.newCommentText = ''; 
        post.comments_count = (post.comments_count || 0) + 1;
      },
      error: (err) => {
        console.error(err);
        alert("Nu s-a putut trimite comentariul.");
      }
    });
  }

  formatTags(tags: any[]): string {
    if (!tags || tags.length === 0) return '';
    return tags.map(t => `#${t.name}`).join(' ');
  }

  getSanitizedUrl(cale: string): SafeUrl {
    if (!cale) return 'assets/placeholder.jpg'; 
    let cleanPath = cale.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (!cleanPath.includes('uploads/')) cleanPath = 'uploads/' + cleanPath;
    return this.sanitizer.bypassSecurityTrustUrl(`${this.serverUrl}/${cleanPath}`);
  }

  getAvatar(cale: string): SafeUrl {
    if (!cale) return 'https://ui-avatars.com/api/?background=random&name=User';
    return this.getSanitizedUrl(cale);
  }

  // --- ADMIN: ȘTERGERE CU NOTIFICARE (NOU) ---
  
  // Helper pentru HTML
  isAdmin(): boolean {
      return this.currentUser && this.currentUser.role === 'admin';
  }

  deletePostByAdmin(post: any) {
    if (!this.isAdmin()) {
        alert("Nu ai permisiunea să faci asta!");
        return;
    }

    if (!confirm('⚠️ Ești sigur că vrei să ștergi postarea? Utilizatorul va primi o notificare de avertisment.')) {
        return;
    }

    // Apelăm serviciul cu ID-ul adminului (this.currentUserId)
    this.service.deleteCaptura(post.id, this.currentUserId!).subscribe({
        next: () => {
            alert('Postare eliminată. Utilizatorul a fost notificat.');
            this.loadFeed(); // Reîncărcăm feed-ul
        },
        error: (err) => {
            console.error(err);
            alert('Eroare la ștergere.');
        }
    });
  }
}