import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // ⚠️ AM ADĂUGAT RouterModule
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // ⚠️ AM ADĂUGAT RouterModule AICI
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
  
  verificationCode: string = '';
  step: number = 1;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private service: FishingService, private router: Router) {}

  // Funcția pentru Pasul 1: Trimite Codul
  onSendCode() {
    if (!this.user.nume || !this.user.email || !this.user.password) {
      this.errorMessage = 'Completează toate datele!';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // ⚠️ MODIFICARE: Trimitem și NUMELE, și EMAILUL
    this.service.sendVerificationCode(this.user.nume, this.user.email).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        alert('Cod trimis pe email! Verifică și spam.');
        this.step = 2;
      },
      error: (err: any) => { // ⚠️ MODIFICARE: Am adăugat tipul ': any'
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
    this.service.register(this.user, this.verificationCode).subscribe({
      next: (res) => {
        this.isLoading = false;
        alert('Cont creat cu succes!');
        this.router.navigate(['/login']);
      },
      error: (err: any) => { // ⚠️ MODIFICARE: Am adăugat tipul ': any'
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