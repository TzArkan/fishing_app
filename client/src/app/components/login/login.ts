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
  step = 1; // Variabilă nouă: 1 = Email, 2 = Parolă
  email = '';
  password = '';
  errorMessage = ''; // Variabilă pentru afișarea elegantă a erorilor

  constructor(private fishingService: FishingService, private router: Router) {}

  // --- PASUL 1: VERIFICARE EMAIL ---
  verifyEmail() {
    if (!this.email) {
      this.errorMessage = 'Te rog introdu o adresă de email.';
      return;
    }
    
    // Curățăm erorile vechi
    this.errorMessage = '';

    // Presupunem că ai creat funcția checkEmail în FishingService
    this.fishingService.checkEmail({ email: this.email }).subscribe({
      next: () => {
        this.step = 2; // Email corect, trecem la parolă
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || "Nu am găsit niciun cont cu acest email.";
      }
    });
  }

  // --- ÎNAPOI LA EMAIL ---
  goBack() {
    this.step = 1;
    this.password = ''; // Curățăm parola pt securitate
    this.errorMessage = '';
  }

  // --- PASUL 2: LOGARE COMPLETĂ ---
  onLogin() {
    if (!this.password) {
      this.errorMessage = 'Te rog introdu parola.';
      return;
    }

    // 1. Pregătim datele din formular
    const credentials = { email: this.email, password: this.password };

    this.fishingService.login(credentials).subscribe({
      next: (response: any) => {
        
        // 2. SALVĂM DATELE UTILIZATORULUI (Logica ta neatinsă)
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          localStorage.setItem('userId', response.user.id); 
        }
        
        if (response.token) {
          localStorage.setItem('token', response.token);
        }

        // 3. --- VERIFICĂM NOTIFICĂRILE ---
        if (response.notifications && response.notifications.length > 0) {
            let msg = "⚠️ NOTIFICĂRI IMPORTANTE:\n\n";
            response.notifications.forEach((notif: any) => {
                msg += "- " + notif.message + "\n";
            });
            alert(msg); 
        }

        // 4. NAVIGARE CĂTRE FEED
        this.router.navigate(['/feed']);
      },
      error: (err) => {
        console.error(err);
        // AICI am scos alerta și am pus mesajul elegant în UI:
        this.errorMessage = err.error?.message || "Parolă incorectă!";
      }
    });
  }
}