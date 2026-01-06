import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>📝 Înregistrare</h2>
        <div class="form-group">
          <label>Numele Tău</label>
          <input type="text" [(ngModel)]="nume" placeholder="Ex: Ion Pescarul">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" [(ngModel)]="email">
        </div>
        <div class="form-group">
          <label>Parolă</label>
          <input type="password" [(ngModel)]="password">
        </div>
        <button (click)="onRegister()" class="btn-primary" style="background-color: #28a745;">Creează Cont</button>
        <div class="footer-link">
          <p>Ai deja cont? <a routerLink="/login">Loghează-te</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.css'] // Folosim același CSS ca la login!
})
export class RegisterComponent {
  nume = '';
  email = '';
  password = '';

  constructor(private service: FishingService, private router: Router) {}

  onRegister() {
    const user = { nume: this.nume, email: this.email, password: this.password };
    this.service.register(user).subscribe({
      next: () => {
        alert("Cont creat! Te rugăm să te loghezi.");
        this.router.navigate(['/login']);
      },
      error: (err) => alert(err.error.message || "Eroare")
    });
  }
}