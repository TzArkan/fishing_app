import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // RouterLink pentru navigare
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private fishingService: FishingService, private router: Router) {}

  onLogin() {
    const credentials = { email: this.email, password: this.password };

    this.fishingService.login(credentials).subscribe({
      next: (response: any) => {
        // 1. SALVĂM USERUL PENTRU PROFIL
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // ---> AICI ERA PROBLEMA: TREBUIE SĂ SALVĂM ID-UL SEPARAT <---
          // Feed-ul caută specific cheia 'userId'
          localStorage.setItem('userId', response.user.id); 
        }
        
        // 2. SALVĂM TOKENUL
        if (response.token) {
          localStorage.setItem('token', response.token);
        }

        // 3. NAVIGARE
        this.router.navigate(['/feed']);
      },
      error: (err) => {
        alert(err.error?.message || "Eroare la logare");
      }
    });
  }
}