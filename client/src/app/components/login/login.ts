import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; 
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

  // Atenție: aici l-am numit 'fishingService'
  constructor(private fishingService: FishingService, private router: Router) {}

  onLogin() {
    // 1. Pregătim datele din formular
    const credentials = { email: this.email, password: this.password };

    this.fishingService.login(credentials).subscribe({
      next: (response: any) => {
        
        // 2. SALVĂM DATELE UTILIZATORULUI
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          // Feed-ul are nevoie specific de 'userId'
          localStorage.setItem('userId', response.user.id); 
        }
        
        // Salvăm tokenul (dacă există)
        if (response.token) {
          localStorage.setItem('token', response.token);
        }

        // 3. --- VERIFICĂM NOTIFICĂRILE (Partea Nouă) ---
        if (response.notifications && response.notifications.length > 0) {
            // Construim mesajul de avertisment
            let msg = "⚠️ NOTIFICĂRI IMPORTANTE:\n\n";
            response.notifications.forEach((notif: any) => {
                msg += "- " + notif.message + "\n";
            });
            // Afișăm alerta utilizatorului
            alert(msg); 
        }

        // 4. NAVIGARE CĂTRE FEED
        this.router.navigate(['/feed']);
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || "Email sau parolă incorectă!");
      }
    });
  }
}