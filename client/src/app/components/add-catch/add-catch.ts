import { Component } from '@angular/core';
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
export class AddCatchComponent {
  specie: string = '';
  lungime: number | null = null;
  detalii: string = '';
  selectedFile: File | null = null;

  constructor(private fishingService: FishingService) {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit() {
    // Validare simplă
    if (!this.specie) {
      alert("Te rog completează specia!");
      return;
    }

    const formData = new FormData();
    formData.append('specie', this.specie);
    if(this.lungime) formData.append('lungime', this.lungime.toString());
    formData.append('detalii', this.detalii);
    
    // Trimitem 0 la coordonate ca să nu dea eroare baza de date
    formData.append('lat', '0');
    formData.append('lng', '0');
    
    if (this.selectedFile) {
      formData.append('poza', this.selectedFile);
    }

    this.fishingService.adaugaCaptura(formData).subscribe({
      next: (res) => {
        alert('Captură adăugată cu succes!');
        // Resetare formular
        this.specie = '';
        this.lungime = null;
        this.detalii = '';
        this.selectedFile = null;
      },
      error: (err) => {
        console.error(err);
        alert('Eroare la salvare.');
      }
    });
  }
}