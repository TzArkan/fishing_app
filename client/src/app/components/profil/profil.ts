import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing';


@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.html',
  styleUrls: ['./profil.css']
})
export class ProfilComponent implements OnInit {

  user: any = null;
  experienceLevel = '';
  profile: {
    name: string;
    location: string;
    bio: string;
    avatar_url: string | null;
  } = {
    name: '',
    location: '',
    bio: '',
    avatar_url: null,
  };



  constructor(
    private service: FishingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;

      this.user = JSON.parse(storedUser);

      // experiență
      this.service.getCapturiUser(this.user.id).subscribe(capturi => {
        const c = capturi.length;
        if (c < 5) this.experienceLevel = 'Începător';
          else if (c < 15) this.experienceLevel = 'Avansat';
            else this.experienceLevel = 'Expert';

      });

      // profil
      this.service.getProfile(this.user.id).subscribe(data => {
        if (data) this.profile = data;
      });
    }
  }

  saveProfile() {
    this.service.updateProfile(this.user.id, this.profile).subscribe({
      next: () => alert('Profil salvat!'),
      error: () => alert('Eroare la salvare profil')
    });
  }
  
  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.service.uploadAvatar(this.user.id, file).subscribe({
      next: (updatedProfile) => {
        this.profile.avatar_url = updatedProfile.avatar_url;
        alert('Avatar actualizat!');
      },
      error: () => alert('Eroare la upload avatar')
    });
  }
}


