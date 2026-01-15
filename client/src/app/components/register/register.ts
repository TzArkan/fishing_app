import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  // AICI AM FĂCUT SCHIMBAREA:
  // Acum îi spunem să citească fișierul extern, nu textul de aici
  templateUrl: './register.html', 
  styleUrls: ['./register.css']
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