import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing'; // Asigură-te că calea e bună
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  step = 1; // 1 = Cere Email, 2 = Schimbă Parola
  email = '';
  code = '';
  newPassword = '';
  
  loading = false;
  message = '';
  error = '';

  constructor(private service: FishingService, private router: Router) {}

  // Pasul 1: Trimite Codul
  sendCode() {
    if (!this.email) return;
    
    this.loading = true;
    this.error = '';
    
    // Apelăm endpoint-ul creat mai sus
    this.service.requestPasswordReset(this.email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.step = 2; // Trecem la ecranul următor
        this.message = "Verifică-ți emailul! 📧";
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || "Eroare la trimitere.";
      }
    });
  }

  // Pasul 2: Confirmă Resetarea
  resetPassword() {
    if (!this.code || !this.newPassword) return;

    this.loading = true;
    this.error = '';

    const payload = {
        email: this.email,
        code: this.code,
        newPassword: this.newPassword
    };

    // Apelăm endpoint-ul de reset
    this.service.confirmPasswordReset(payload).subscribe({
      next: (res: any) => {
        alert("Gata! Parola a fost schimbată. Te poți loga.");
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || "Cod incorect sau expirat.";
      }
    });
  }
}