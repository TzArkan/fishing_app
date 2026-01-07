import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing'; 

@Component({
  selector: 'app-add-catch',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add-catch.html',
  styleUrls: ['./add-catch.css']
})
export class AddCatchComponent implements OnInit {
  // Lista predefinită de specii
  speciiLista: string[] = [
    // Dunăre & Deltă
    'Crap', 'Somn', 'Știucă', 'Șalău', 'Avat', 'Biban', 'Caras', 'Plătică', 'Mreană', 'Roșioară',
    // Marea Neagră
    'Guvide', 'Stavrid', 'Hamsie', 'Zargan', 'Chefal', 'Calcan', 'Lufar',
    // Altele
    'Păstrăv', 'Clean', 'Altă specie'
  ];

  specie: string = ''; 
  lungime: number | null = null;
  detalii: string = '';
  dataCapturii: string = ''; // <--- Variabila nouă pentru dată
  selectedFile: File | null = null;

  constructor(private fishingService: FishingService) {}

  // Se execută când se încarcă pagina
  ngOnInit(): void {
    // Setăm automat data de AZI în formatul corect (YYYY-MM-DD)
    this.dataCapturii = new Date().toISOString().split('T')[0];
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit() {
    // 1. Validare User Logat
    const userString = localStorage.getItem('user');
    if (!userString) {
      alert("Nu ești logat! Te rog autentifică-te.");
      return;
    }
    const user = JSON.parse(userString);

    // 2. Validare Specie (Să nu fie goală)
    if (!this.specie) {
      alert("Te rog alege o specie din listă!");
      return;
    }

    // 3. Validare Lungime (Să nu fie negativă)
    if (this.lungime !== null && this.lungime < 0) {
      alert("Lungimea nu poate fi negativă!");
      return;
    }

    // 4. Pregătirea datelor pentru server
    const formData = new FormData();
    formData.append('specie', this.specie);
    if(this.lungime) formData.append('lungime', this.lungime.toString());
    formData.append('detalii', this.detalii);
    
    // Trimitem și data aleasă
    formData.append('data_capturii', this.dataCapturii); 
    
    // Coordonate default (0,0) - le poți reactiva pe viitor dacă repari harta
    formData.append('lat', '0');
    formData.append('lng', '0');
    
    // Adăugăm ID-ul utilizatorului ca să știm a cui e captura
    formData.append('user_id', user.id); 

    if (this.selectedFile) {
      formData.append('poza', this.selectedFile);
    }

    // 5. Trimiterea efectivă
    this.fishingService.adaugaCaptura(formData).subscribe({
      next: (res) => {
        alert('Captură adăugată cu succes! 🎣');
        // Resetăm formularul ca să fie curat
        this.specie = '';
        this.lungime = null;
        this.detalii = '';
        this.selectedFile = null;
        // Resetăm data la ziua de azi
        this.dataCapturii = new Date().toISOString().split('T')[0];
      },
      error: (err) => {
        console.error(err);
        alert('Eroare la salvare. Verifică dacă serverul merge.');
      }
    });
  }
}