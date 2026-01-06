import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- IMPORTANT pentru editare
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule], // <--- Adaugă FormsModule aici
  templateUrl: './history.html',
  styleUrls: ['./history.css']
})
export class HistoryComponent implements OnInit {
  capturi: any[] = [];
  serverUrl = 'http://localhost:5000/'; 
  
  // Variabile pentru Editare
  editMode: boolean = false;
  currentCaptura: any = {}; // Aici ținem datele pe care le modificăm

  constructor(private service: FishingService) {}

  ngOnInit(): void {
    this.loadCapturi();
  }

  loadCapturi() {
    // 1. Luăm userul din memorie
    const userString = localStorage.getItem('user');
    
    if (userString) {
      const user = JSON.parse(userString);
      
      // 2. Cerem doar capturile LUI
      this.service.getCapturi(user.id).subscribe({
        next: (data) => this.capturi = data,
        error: (err) => console.error(err)
      });
    } else {
        // Opțional: redirecționează la login dacă nu e logat
        console.error("Nu ești logat!");
    }
  }

  // --- LOGICA DE ȘTERGERE ---
  onDelete(id: number) {
    if(confirm('Sigur vrei să ștergi această captură? Nu se mai poate recupera!')) {
      this.service.stergeCaptura(id).subscribe(() => {
        // Scoatem captura din lista locală ca să dispară instant
        this.capturi = this.capturi.filter(c => c.id !== id);
      });
    }
  }

  // --- LOGICA DE EDITARE ---
  startEdit(captura: any) {
    this.editMode = true;
    // Facem o copie ca să nu modificăm direct pe card înainte de salvare
    this.currentCaptura = { ...captura }; 
  }

  cancelEdit() {
    this.editMode = false;
    this.currentCaptura = {};
  }

  saveEdit() {
    this.service.editeazaCaptura(this.currentCaptura.id, this.currentCaptura).subscribe({
      next: () => {
        alert('Modificare salvată!');
        this.editMode = false;
        this.loadCapturi(); // Reîncărcăm lista ca să vedem schimbările
      },
      error: () => alert('Eroare la actualizare')
    });
  }
}