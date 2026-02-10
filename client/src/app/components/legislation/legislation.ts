import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing'; // <--- 1. IMPORTĂ SERVICIUL

@Component({
  selector: 'app-legislation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './legislation.html',
  styleUrls: ['./legislation.css']
})
export class LegislationComponent {
  
  activeTab: 'laws' | 'report' = 'laws';
  showMapModal = false;

  // --- HARTA ---
  private L: any = null;
  private map: any = null;
  private marker: any = null;
  
  // Coordonate implicite (Centrul României)
  selectedLat: number = 45.9432;
  selectedLng: number = 24.9668;

  // --- DATA: FORMULAR ---
  maxDate: string = new Date().toISOString().split('T')[0];

  reportData = {
    locationCoords: '',
    locationText: '',
    description: '',
    date: new Date().toISOString().split('T')[0], // Default azi
  };

  selectedFile: File | null = null;
  
  // Datele despre legi
  laws = [
    { title: 'Perioade de Prohibiție 2025', icon: '📅', content: ['9 Apr - 7 Iun (Generală)', 'Știucă: 1 Feb - 20 Mar', 'Șalău: 20 Mar - 7 Iun'], warning: 'Amendă 600-1000 lei.' },
    { title: 'Dimensiuni Minime', icon: '📏', content: ['Crap: 40 cm', 'Caras: 20 cm', 'Șalău: 40 cm', 'Somn: 50 cm'], warning: 'Confiscare permis.' },
    { title: 'Infracțiuni', icon: '⚖️', content: ['Pescuit electric', 'Plase monofilament', 'Comercializare sturioni'], warning: 'Dosar penal.' }
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private service: FishingService // <--- 2. INJECTĂM SERVICIUL AICI
  ) {}

  switchTab(tab: 'laws' | 'report') {
    this.activeTab = tab;
  }

  // --- LOGICA HARTA ---
  async openMapPicker() {
    this.showMapModal = true;
    
    if (isPlatformBrowser(this.platformId) && !this.L) {
        this.L = await import('leaflet');
    }

    setTimeout(() => this.initMap(), 100);
  }

  initMap() {
    if (!this.L) return;

    if(this.map) {
        this.map.remove();
    }
    
    this.map = this.L.map('legislation-map', {
        center: [this.selectedLat, this.selectedLng],
        zoom: 7
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    
    this.marker = this.L.marker([this.selectedLat, this.selectedLng], {draggable: true}).addTo(this.map);

    this.map.on('click', (e: any) => {
        this.marker.setLatLng(e.latlng);
        this.selectedLat = e.latlng.lat;
        this.selectedLng = e.latlng.lng;
    });

    this.marker.on('dragend', (e: any) => {
        const pos = this.marker.getLatLng();
        this.selectedLat = pos.lat;
        this.selectedLng = pos.lng;
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            this.map.setView([lat, lng], 13);
            this.marker.setLatLng([lat, lng]);
            this.selectedLat = lat;
            this.selectedLng = lng;
        });
    }
  }

  confirmLocation() {
      this.reportData.locationCoords = `${this.selectedLat.toFixed(5)}, ${this.selectedLng.toFixed(5)}`;
      this.reportData.locationText = `Locație Selectată: ${this.reportData.locationCoords}`;
      this.showMapModal = false;
  }

  closeMapModal() {
    this.showMapModal = false;
  }

  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }
  
  // --- 3. FUNCȚIA DE TRIMITERE REALĂ ---
submitReport() {
    if (!this.reportData.description || !this.reportData.locationCoords) { 
        alert('Te rog selectează locația și descrie fapta!'); 
        return; 
    }

    // 1. Creăm obiectul FormData (obligatoriu pentru poze)
    const formData = new FormData();

    // 2. Adăugăm câmpurile text
    if (isPlatformBrowser(this.platformId)) {
        const storedId = localStorage.getItem('userId');
        if (storedId) formData.append('userId', storedId);
    }

    formData.append('latitude', this.selectedLat.toString());
    formData.append('longitude', this.selectedLng.toString());
    formData.append('locationText', this.reportData.locationText);
    formData.append('description', this.reportData.description);
    formData.append('date', this.reportData.date);

    // 3. Adăugăm POZA (dacă există)
    if (this.selectedFile) {
        // 'poza' trebuie să fie același nume ca în index.js la upload.single('poza')
        formData.append('poza', this.selectedFile); 
    }

    console.log('Se trimite raportul (FormData)...');

    // 4. Trimitem la server
    this.service.sendReport(formData).subscribe({
        next: (response) => {
            alert('✅ Sesizare cu FOTO înregistrată! Mulțumim.');
            
            // Reset
            this.reportData.description = '';
            this.reportData.locationText = '';
            this.reportData.locationCoords = '';
            this.selectedFile = null; // Resetăm fișierul
            this.activeTab = 'laws';
        },
        error: (error) => {
            console.error('Eroare:', error);
            alert('❌ Eroare la trimitere.');
        }
    });
  }
}