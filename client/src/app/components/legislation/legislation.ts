import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing';

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
  
  selectedLat: number = 45.9432;
  selectedLng: number = 24.9668;

  // --- DATA: FORMULAR ---
  maxDate: string = new Date().toISOString().split('T')[0];

  reportData = {
    locationCoords: '',
    locationText: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  };

  selectedFile: File | null = null;
  
  // Array-ul laws corectat și formatat
  laws = [
    {
      title: 'Perioade de Prohibiție 2026',
      icon: '📅',
      content: [
        'Generală: 9 Apr - 7 Iun (60 zile)',
        'Frontieră Dunăre: 24 Apr - 7 Iun',
        'Știucă: 1 Feb - 20 Mar',
        'Șalău & Biban: 20 Mar - 7 Iun',
        'Păstrăv (toate speciile): 1 Oct - 31 Mar'
      ],
      warning: 'Amendă 600 - 1.000 lei + suspendare permis.'
    },
    {
      title: 'Dimensiuni Minime (Ape Dulci)',
      icon: '📏',
      content: [
        'Crap: 35 cm | Somn: 50 cm',
        'Șalău: 40 cm | Știucă: 40 cm',
        'Caras: 20 cm | Biban: 12 cm',
        'Clean: 25 cm | Mreană: 27 cm',
        'Avat: 30 cm | Plătică: 25 cm',
        'Lin: 25 cm | Scobar: 20 cm',
        'Păstrăv: 20 cm | Lipan: 25 cm',
        'Babușcă/Roșioară: 15 cm'
      ],
      warning: 'Amendă 300 - 600 lei + Reținere permis 90 zile.'
    },
    { 
      title: 'Infracțiuni', 
      icon: '⚖️', 
      content: ['Pescuit electric', 'Plase monofilament', 'Comercializare sturioni'], 
      warning: 'Dosar penal (Închisoare 1-3 ani).' 
    },
    {
      title: 'Reguli de Reținere',
      icon: '🐟',
      content: [
        'Limită zilnică: 5 kg de pește sau o singură bucată (dacă depășește 5kg)',
        'Pescuit sportiv: Interzisă vânzarea capturii',
        'Măsurare: De la vârful botului la baza cozii'
      ],
      warning: 'Confiscare scule și captură.'
    }
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private service: FishingService
  ) {}

  switchTab(tab: 'laws' | 'report') {
    this.activeTab = tab;
  }

  async openMapPicker() {
    this.showMapModal = true;
    
    if (isPlatformBrowser(this.platformId) && !this.L) {
        // Importăm Leaflet doar în browser
        const leaflet = await import('leaflet');
        this.L = leaflet.default || leaflet; // Asigurăm compatibilitatea modulelor
    }

    setTimeout(() => this.initMap(), 100);
  }

  initMap() {
    if (!this.L) return;

    if(this.map) {
        this.map.remove();
    }
    
    // Asigură-te că ai un div cu id="legislation-map" în HTML
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
        }, (err) => {
            console.warn("Geolocația nu a putut fi accesată:", err);
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

  onFileSelected(event: any) { 
      if (event.target.files && event.target.files.length > 0) {
          this.selectedFile = event.target.files[0]; 
      }
  }
  
  submitReport() {
    if (!this.reportData.description || !this.reportData.locationCoords) { 
        alert('Te rog selectează locația și descrie fapta!'); 
        return; 
    }

    const formData = new FormData();

    if (isPlatformBrowser(this.platformId)) {
        const storedId = localStorage.getItem('userId');
        if (storedId) formData.append('userId', storedId);
    }

    formData.append('latitude', this.selectedLat.toString());
    formData.append('longitude', this.selectedLng.toString());
    formData.append('locationText', this.reportData.locationText);
    formData.append('description', this.reportData.description);
    formData.append('date', this.reportData.date);

    if (this.selectedFile) {
        formData.append('poza', this.selectedFile); 
    }

    console.log('Se trimite raportul...');

    this.service.sendReport(formData).subscribe({
        next: (response) => {
            alert('✅ Sesizare cu FOTO înregistrată! Mulțumim.');
            
            // Reset
            this.reportData.description = '';
            this.reportData.locationText = '';
            this.reportData.locationCoords = '';
            this.selectedFile = null;
            this.activeTab = 'laws';
        },
        error: (error) => {
            console.error('Eroare:', error);
            alert('❌ Eroare la trimitere.');
        }
    });
  }
}