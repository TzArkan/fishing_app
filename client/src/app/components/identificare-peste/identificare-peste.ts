import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-identificare-peste',
  standalone: true,
  imports: [CommonModule, HttpClientModule], // Avem nevoie de HttpClientModule
  templateUrl: './identificare-peste.html',
  styleUrls: ['./identificare-peste.css']
})
export class IdentificarePesteComponent {

  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  
  // Variabile pentru rezultat
  predictionResult: string | null = null;
  latinName: string | null = null;
  predictionConfidence: string | null = null;
  
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.errorMessage = null;
      this.predictionResult = null;

      // Generăm previzualizarea
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result || null;
      };
      reader.readAsDataURL(file);

      // Trimitem automat la server
      this.uploadAndPredict(file);
    }
  }

  uploadAndPredict(file: File) {
    this.isLoading = true;
    const formData = new FormData();
    formData.append('file', file);

    // Apelăm backend-ul tău Node.js (care va vorbi cu Python)
    this.http.post<any>('http://localhost:5000/api/identifica-peste', formData)
      .subscribe({
        next: (response) => {
          this.predictionResult = response.fish_name;   // Numele în română
          this.predictionConfidence = response.confidence; // Procentajul
          this.latinName = response.latin_name; // Numele științific
          this.isLoading = false;
        },
        error: (error) => {
          console.error("Eroare server:", error);
          this.errorMessage = "A apărut o eroare la server. Încearcă din nou.";
          this.isLoading = false;
        }
      });
  }

  reset() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.predictionResult = null;
    this.errorMessage = null;
  }
}