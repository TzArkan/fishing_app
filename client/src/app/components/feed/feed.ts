import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FishingService } from '../../services/fishing';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feed.html',
  styleUrls: ['./feed.css']
})
export class FeedComponent implements OnInit {
  posts: any[] = [];
  serverUrl = 'http://localhost:5000'; // Sau url-ul tău

  constructor(private service: FishingService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.loadFeed();
  }

  loadFeed() {
    this.service.getFeed().subscribe({
      next: (data: any) => {
        console.log('Feed data:', data);
        this.posts = data;
      },
      error: (err) => console.error(err)
    });
  }

  // Funcție pentru a repara URL-urile pozelor (copy-paste de la istoric)
  getSanitizedUrl(cale: string): SafeUrl {
    if (!cale) return 'assets/placeholder.jpg'; 
    let cleanPath = cale.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (!cleanPath.includes('uploads/')) cleanPath = 'uploads/' + cleanPath;
    return this.sanitizer.bypassSecurityTrustUrl(`${this.serverUrl}/${cleanPath}`);
  }

  // Funcție specială pentru Avatare (dacă nu are, punem unul standard)
  getAvatar(cale: string): SafeUrl {
    if (!cale) return 'https://ui-avatars.com/api/?background=random&name=User';
    return this.getSanitizedUrl(cale);
  }
}