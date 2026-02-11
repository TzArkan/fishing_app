import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-edit-catch',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './edit-catch.html',
  styleUrls: ['./edit-catch.css']
})
export class EditCatch implements OnInit {
  
  // Datele inițiale
  catchData: any = {
    specie: '',
    lungime: 0,
    detalii: '',
    poza_url: ''
  };
  
  id: any;
  selectedFile: File | null = null;
  serverUrl = 'http://localhost:5000/'; 

  constructor(
    private service: FishingService,
    private route: ActivatedRoute,
    private router: Router, // Avem nevoie de Router pentru navigare
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');

    // Încărcăm datele doar dacă suntem în Browser (evităm eroarea de SSR)
    if (isPlatformBrowser(this.platformId)) {
      if (this.id) {
        this.service.getCatchById(this.id).subscribe({
          next: (data: any) => {
            this.catchData = data;
          },
          error: (err: any) => {
            console.error("Eroare la încărcare:", err);
            // Dacă nu găsește captura, ne întoarcem la istoric
            this.router.navigate(['/istoric']); 
          }
        });
      }
    }
  }

  // Se apelează când alegi o poză nouă
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // --- 1. Funcția pentru Butonul ANULEAZĂ ---
  cancel() {
    // Te trimite imediat înapoi la istoric
    this.router.navigate(['/istoric']);
  }

  // --- 2. Funcția pentru Butonul SALVEAZĂ ---
  saveChanges() {
    // Validare simplă
    if (this.catchData.lungime < 0) {
      alert("Lungimea nu poate fi negativă! 🚫");
      return; 
    }

    const formData = new FormData();
    formData.append('specie', this.catchData.specie);
    formData.append('lungime', this.catchData.lungime);
    formData.append('detalii', this.catchData.detalii);

    // Adăugăm poza doar dacă a fost schimbată
    if (this.selectedFile) {
      formData.append('poza', this.selectedFile);
    }

    this.service.updateCatch(this.id, formData).subscribe({
      next: (res: any) => {
        alert('Captură modificată cu succes! ✅');
        
        // AICI ESTE NAVIGAREA CĂTRE ISTORIC
        this.router.navigate(['/istoric']); 
      },
      error: (err: any) => {
        console.error("Eroare la salvare:", err);
        alert('Eroare la salvare! Verifică dacă serverul merge.');
      }
    });
  }
}