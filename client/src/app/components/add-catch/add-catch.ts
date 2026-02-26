import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FishingService } from '../../services/fishing';

const POLYGON_DELTA = [
  { lat: 45.42, lng: 29.50 }, { lat: 44.85, lng: 29.60 }, 
  { lat: 44.80, lng: 28.90 }, { lat: 45.18, lng: 28.75 }, { lat: 45.45, lng: 29.20 }
];

function detecteazaZona(lat: number, lng: number): string {
  if (isPointInPolygon({ lat, lng }, POLYGON_DELTA)) {
      return 'delta';
  }
  if (lng > 27.8 && lat > 45.3 && lat < 48.3) {
      return 'frontiera';
  }
  if (lat < 44.6 && lng > 21.5 && lng < 28.2) {
      return 'frontiera';
  }
  if (lat > 47.8 && lng < 24.5) {
      return 'frontiera';
  }
  return 'general';
}

function isPointInPolygon(point: any, vs: any[]) {
    let x = point.lat, y = point.lng, inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].lat, yi = vs[i].lng, xj = vs[j].lat, yj = vs[j].lng;
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// --- CONFIGURARE PROHIBIȚIE STANDARD ---
const PROHIBITIE_STANDARD = {
  'general':   { s: '04-09', e: '06-07' }, // 9 Apr - 7 Iun
  'frontiera': { s: '04-24', e: '06-07' }, // 24 Apr - 7 Iun
  'delta':     { s: '04-09', e: '06-07' }  // Delta 
};

// --- REGULI PESCUIT (DIMENSIUNI & EXCEPȚII) ---
const REGULI_PESCUIT: any = {
  // 1. SPECII CU PROHIBIȚIE SPECIFICĂ
  'Știucă': { min: 40, prohibitie: { 'general': {s:'02-01', e:'03-20'}, 'frontiera': {s:'02-01', e:'03-20'}, 'delta': {s:'02-01', e:'03-20'} } },
  'Șalău': { min: 40, prohibitie: { 'general': {s:'03-20', e:'06-07'}, 'frontiera': {s:'03-20', e:'06-07'}, 'delta': {s:'03-20', e:'06-07'} } },
  'Biban': { min: 12, prohibitie: { 'general': {s:'03-20', e:'06-07'}, 'frontiera': {s:'03-20', e:'06-07'}, 'delta': {s:'03-20', e:'06-07'} } },
  'Păstrăv': { min: 20, prohibitie: { 'general': {s:'10-01', e:'03-31'}, 'frontiera': {s:'10-01', e:'03-31'}, 'delta': {s:'10-01', e:'03-31'} } },

  // 2. SPECII STANDARD
  'Crap':     { min: 35, standard: true },
  'Somn':     { min: 50, standard: true },
  'Caras':    { min: 20, standard: true },
  'Clean':    { min: 25, standard: true },
  'Mreană':   { min: 27, standard: true },
  'Avat':     { min: 30, standard: true },
  'Plătică':  { min: 25, standard: true },
  'Lin':      { min: 25, standard: true },
  'Scobar':   { min: 20, standard: true },
  'Lipan':    { min: 25, standard: true }, 
  'Babușcă':  { min: 15, standard: true },
  'Roșioară': { min: 15, standard: true },
  'Morunaș': { min: 25, standard: true },
  
  // Altele
  'Sturion':  { protejat: true } 
};

@Component({
  selector: 'app-add-catch',
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule],
  templateUrl: './add-catch.html',
  styleUrls: ['./add-catch.css']
})
export class AddCatchComponent implements OnInit {
  
  showMapModal = false;
  private L: any = null;
  private map: any = null;
  private marker: any = null;
  selectedLat: number = 46.0;
  selectedLng: number = 25.0;
  maxDate: string = '';
  zonaDetectata: string = 'general';
  zonaNumeAfisat: string = 'Ape Interioare';

  speciiLista: string[] = [...Object.keys(REGULI_PESCUIT), 'Altă specie'].sort();
  
  specie: string = ''; 
  lungime: number | null = null;
  detalii: string = '';
  dataCapturii: string = ''; 
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  isPredicting = false;
  aiConfidence: number | null = null;

  constructor(
    private fishingService: FishingService,
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.maxDate = new Date().toISOString().split('T')[0];
    this.dataCapturii = this.maxDate;
    this.dataCapturii = new Date().toISOString().split('T')[0];
    if (isPlatformBrowser(this.platformId) && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            this.selectedLat = pos.coords.latitude;
            this.selectedLng = pos.coords.longitude;
            this.actualizeazaZona();
        });
    }
  }

  actualizeazaZona() {
      const zonaCod = detecteazaZona(this.selectedLat, this.selectedLng);
      this.zonaDetectata = zonaCod;
      if (zonaCod === 'delta') this.zonaNumeAfisat = 'Delta Dunării 🌊';
      else if (zonaCod === 'frontiera') this.zonaNumeAfisat = 'Zonă de Frontieră 🚧';
      else this.zonaNumeAfisat = 'Ape Interioare 🏞️';
  }

  async openMapPicker() {
    this.showMapModal = true;
    if (isPlatformBrowser(this.platformId)) {
        if (!this.L) {
            this.L = await import('leaflet');
        }
        this.initMap();
    }
  }

  initMap() {
    if (this.map) {
        this.map.remove();
        this.map = null;
    }
    setTimeout(() => {
        const mapElement = document.getElementById('catch-map');
        if (!mapElement) return;

        this.map = this.L.map('catch-map', { center: [this.selectedLat, this.selectedLng], zoom: 7 });
        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.map);
        
        this.marker = this.L.marker([this.selectedLat, this.selectedLng], {draggable: true}).addTo(this.map);

        this.map.on('click', (e: any) => { this.updateMarker(e.latlng.lat, e.latlng.lng); });
        this.marker.on('dragend', (e: any) => { 
            const pos = this.marker.getLatLng();
            this.updateMarker(pos.lat, pos.lng);
        });
        
        this.map.invalidateSize();
    }, 100);
  }

  updateMarker(lat: number, lng: number) {
      this.selectedLat = lat;
      this.selectedLng = lng;
      this.marker.setLatLng([lat, lng]);
  }

  confirmLocation() {
      this.actualizeazaZona();
      this.showMapModal = false;
      if (this.map) {
          this.map.remove();
          this.map = null;
      }
  }

  closeMapModal() {
    this.showMapModal = false;
    if (this.map) {
        this.map.remove();
        this.map = null; 
    }
  }

  // ==========================================
  // LOGICA FOTO (Inclusiv Previzualizare)
  // ==========================================
  onFileSelected(event: any) { 
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.aiConfidence = null; // Resetăm AI dacă se schimbă poza

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result || null; 
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.aiConfidence = null;
    this.specie = ''; 
    const fileInput = document.getElementById('photoInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // ==========================================
  // FUNCȚIE DE IDENTIFICARE AI
  // ==========================================
  identificaPoza() {
      if (!this.selectedFile) {
          alert("Te rog adaugă o poză mai întâi pentru a identifica peștele!");
          return;
      }

      this.isPredicting = true;
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      this.http.post<any>('http://localhost:5000/api/identifica-peste', formData)
        .subscribe({
          next: (response) => {
            this.isPredicting = false;
            
            // Transformăm în număr rotund (din 98.765 devine 99)
            const acuratete = Math.round(Number(response.confidence));

            if (this.speciiLista.includes(response.fish_name)) {
                this.specie = response.fish_name; 
                this.aiConfidence = acuratete; 
            } else {
                alert(`AI a detectat: ${response.fish_name} (${acuratete}%), dar nu este în lista de reguli. Am setat pe "Altă specie".`);
                this.specie = 'Altă specie';
                this.aiConfidence = acuratete;
            }
          },
          error: (error) => {
            console.error("Eroare AI:", error);
            alert("Nu am putut identifica peștele din poză. Serverul AI ar putea fi oprit.");
            this.isPredicting = false;
          }
        });
  }

  // --- VALIDARE LEGALĂ ---
  valideazaLegalitate(): boolean {
    const regulaSpecie = REGULI_PESCUIT[this.specie];
    if (!regulaSpecie) return true;

    if (regulaSpecie.protejat) {
      alert(`❌ ILEGAL: ${this.specie} este specie protejată!`);
      return false;
    }

    if (this.lungime && this.lungime < regulaSpecie.min) {
      alert(`⚠️ SUBDIMENSIUNE: ${this.specie} trebuie să aibă minim ${regulaSpecie.min} cm.`);
      return false;
    }

    if (this.dataCapturii) {
      let regulaDate;
      if (regulaSpecie.prohibitie) {
        regulaDate = regulaSpecie.prohibitie[this.zonaDetectata];
      } 
      else if (regulaSpecie.standard) {
        regulaDate = PROHIBITIE_STANDARD[this.zonaDetectata as keyof typeof PROHIBITIE_STANDARD];
      }

      if (regulaDate) {
        const dataSelectata = new Date(this.dataCapturii);
        const an = dataSelectata.getFullYear();
        const start = new Date(`${an}-${regulaDate.s}`);
        const end = new Date(`${an}-${regulaDate.e}`);

        let inProhibitie = false;
        if (start <= end) {
            inProhibitie = dataSelectata >= start && dataSelectata <= end;
        } else {
            inProhibitie = dataSelectata >= start || dataSelectata <= end;
        }

        if (inProhibitie) {
          alert(`🚫 PROHIBIȚIE (${this.zonaNumeAfisat}): Pescuitul la ${this.specie} este interzis între ${regulaDate.s} și ${regulaDate.e}.`);
          return false;
        }
      }
    }
    return true;
  }

  onSubmit() {
    if (this.dataCapturii > this.maxDate) {
      alert("Eroare: Nu poți adăuga o captură într-o dată viitoare!");
      return;
    }
    const userString = localStorage.getItem('user');
    if (!userString) { this.router.navigate(['/login']); return; }
    const user = JSON.parse(userString);

    // Am scos validarea de poză obligatorie aici pentru că o ai deja sus, dar poți să o lași dacă vrei să forțezi o poză la orice captură
    // if (!this.selectedFile) { alert("Te rog adaugă o fotografie a capturii!"); return; }

    if (!this.specie) { alert("Alege specia!"); return; }
    if (this.lungime !== null && this.lungime < 0) { alert("Lungime invalidă!"); return; }

    if (!this.valideazaLegalitate()) return;

    const formData = new FormData();
    formData.append('specie', this.specie);
    if(this.lungime) formData.append('lungime', this.lungime.toString());
    formData.append('detalii', `[${this.zonaNumeAfisat}] ${this.detalii}`);
    formData.append('data_capturii', this.dataCapturii); 
    formData.append('lat', this.selectedLat.toString());
    formData.append('lng', this.selectedLng.toString());
    formData.append('user_id', user.id); 

    if (this.selectedFile) formData.append('poza', this.selectedFile);

    this.fishingService.addCaptura(formData).subscribe({
      next: () => {
        alert('Captură legală adăugată! ✅');
        this.router.navigate(['/history']); 
      },
      error: () => alert('Eroare server.')
    });
  }
}