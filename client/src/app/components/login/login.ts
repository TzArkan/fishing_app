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
      next: (res) => {
        alert("Autentificare reușită! Bine ai venit, " + res.user.nume);
        // Salvăm faptul că suntem logați (opțional pentru viitor)
        localStorage.setItem('user', JSON.stringify(res.user));
        // Navigăm la pagina principală

        
        this.router.navigate(['/profil']);
      },
      error: (err) => {
        alert(err.error.message || "Eroare la logare");
      }
    });
  }
}