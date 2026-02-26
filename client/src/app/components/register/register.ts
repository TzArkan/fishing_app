import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], 
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  // Datele formularului
  user = {
    nume: '',
    email: '',
    password: ''
  };
  
  // --- NOU: Variabilă pentru confirmarea parolei ---
  confirmPassword: string = ''; 

  verificationCode: string = '';
  step: number = 1;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private service: FishingService, private router: Router) {}

  // Funcția pentru Pasul 1: Trimite Codul
  onSendCode() {
    // 1. Verificare câmpuri goale (am adăugat și confirmPassword aici)
    if (!this.user.nume || !this.user.email || !this.user.password || !this.confirmPassword) {
      this.errorMessage = 'Completează toate datele!';
      return;
    }

    // --- NOU: Verificare coincidență parole ---
    if (this.user.password !== this.confirmPassword) {
      this.errorMessage = 'Parolele nu coincid. Te rog să verifici!';
      return;
    }

    // 2. Validare Semantică Email Strictă
    const strictEmailRegex = /^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]{2,}\.[a-zA-Z]{2,}$/;
    if (!strictEmailRegex.test(this.user.email)) {
      this.errorMessage = 'Adresa de email este prea scurtă sau invalidă (ex: ion@yahoo.com).';
      return;
    }

    // 3. Validare Securitate Parolă
    const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(this.user.password)) {
      this.errorMessage = 'Parola trebuie să aibă minim 8 caractere, o literă mare și un caracter special.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Trimitem datele la server
    this.service.sendVerificationCode(this.user.nume, this.user.email).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        alert('Cod trimis pe email! Verifică și spam.');
        this.step = 2;
      },
      error: (err: any) => { 
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Eroare la trimiterea codului';
      }
    });
  }

  // Funcția pentru Pasul 2: Finalizare Înregistrare
  onFinalizeRegister() {
    if (!this.verificationCode) {
      this.errorMessage = 'Introdu codul primit pe email!';
      return;
    }

    this.isLoading = true;
    this.errorMessage = ''; 

    this.service.register(this.user, this.verificationCode).subscribe({
      next: (res) => {
        this.isLoading = false;
        alert('Cont creat cu succes!');
        this.router.navigate(['/login']);
      },
      error: (err: any) => { 
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Cod incorect sau expirat!';
      }
    });
  }

  goBack() {
    this.step = 1;
    this.errorMessage = '';
  }
}