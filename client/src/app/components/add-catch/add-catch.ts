import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
// Se aplică speciilor care nu au date specifice
const PROHIBITIE_STANDARD = {
  'general':   { s: '04-09', e: '06-07' }, // 9 Apr - 7 Iun
  'frontiera': { s: '04-24', e: '06-07' }, // 24 Apr - 7 Iun
  'delta':     { s: '04-09', e: '06-07' }  // Delta (aliniat la general în lipsa altor date)
};

// --- REGULI PESCUIT (DIMENSIUNI & EXCEPȚII) ---
const REGULI_PESCUIT: any = {
  // 1. SPECII CU PROHIBIȚIE SPECIFICĂ (Datele tale)
  'Știucă': { 
    min: 40, 
    prohibitie: { // 1 Feb - 20 Mar (toate zonele)
      'general': {s:'02-01', e:'03-20'}, 'frontiera': {s:'02-01', e:'03-20'}, 'delta': {s:'02-01', e:'03-20'} 
    } 
  },
  'Șalău': { 
    min: 40, 
    prohibitie: { // 20 Mar - 7 Iun (toate zonele)
      'general': {s:'03-20', e:'06-07'}, 'frontiera': {s:'03-20', e:'06-07'}, 'delta': {s:'03-20', e:'06-07'} 
    } 
  },
  'Biban': { 
    min: 12, 
    prohibitie: { // 20 Mar - 7 Iun (toate zonele - grupat cu Șalăul)
      'general': {s:'03-20', e:'06-07'}, 'frontiera': {s:'03-20', e:'06-07'}, 'delta': {s:'03-20', e:'06-07'} 
    } 
  },
  'Păstrăv': { 
    min: 20, 
    prohibitie: { // 1 Oct - 31 Mar (peste an)
      'general': {s:'10-01', e:'03-31'}, 'frontiera': {s:'10-01', e:'03-31'}, 'delta': {s:'10-01', e:'03-31'} 
    } 
  },

  // 2. SPECII STANDARD (Folosesc regula generală/frontieră)
  'Crap':     { min: 35, standard: true },
  'Somn':     { min: 50, standard: true },
  'Caras':    { min: 20, standard: true },
  'Clean':    { min: 25, standard: true },
  'Mreană':   { min: 27, standard: true },
  'Avat':     { min: 30, standard: true },
  'Plătică':  { min: 25, standard: true },
  'Lin':      { min: 25, standard: true },
  'Scobar':   { min: 20, standard: true },
  'Lipan':    { min: 25, standard: true }, // Atenție: Uneori e protejat, dar am pus limita cerută
  'Babușcă':  { min: 15, standard: true },
  'Roșioară': { min: 15, standard: true },
  
  // Altele
  'Sturion':  { protejat: true } // Rămâne protejat
};

@Component({
  selector: 'app-add-catch',
  standalone: true,
  imports: [FormsModule, CommonModule],
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
  
  zonaDetectata: string = 'general';
  zonaNumeAfisat: string = 'Ape Interioare';

  // Generăm lista de specii direct din cheile obiectului de reguli + "Altă specie"
  speciiLista: string[] = [...Object.keys(REGULI_PESCUIT), 'Altă specie'].sort();
  
  specie: string = ''; 
  lungime: number | null = null;
  detalii: string = '';
  dataCapturii: string = ''; 
  selectedFile: File | null = null;

  constructor(
    private fishingService: FishingService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
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

    // 2. IMPORTANT: Folosim un mic delay ca să fim siguri că <div id="catch-map"> există în pagină
    setTimeout(() => {
        // Verificăm din nou dacă elementul există înainte de a crea harta
        const mapElement = document.getElementById('catch-map');
        if (!mapElement) return;

        // 3. Creăm harta
        this.map = this.L.map('catch-map', { 
            center: [this.selectedLat, this.selectedLng], 
            zoom: 7 
        });

        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.map);
        
        this.marker = this.L.marker([this.selectedLat, this.selectedLng], {draggable: true}).addTo(this.map);

        this.map.on('click', (e: any) => { this.updateMarker(e.latlng.lat, e.latlng.lng); });
        this.marker.on('dragend', (e: any) => { 
            const pos = this.marker.getLatLng();
            this.updateMarker(pos.lat, pos.lng);
        });
        
        // 4. Invalidate Size pentru a preveni harta gri
        this.map.invalidateSize();
        
    }, 100); // 100ms delay
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
  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }

  // --- VALIDARE LEGALĂ ---
  valideazaLegalitate(): boolean {
    const regulaSpecie = REGULI_PESCUIT[this.specie];
    if (!regulaSpecie) return true;

    // 1. Protejat
    if (regulaSpecie.protejat) {
      alert(`❌ ILEGAL: ${this.specie} este specie protejată!`);
      return false;
    }

    // 2. Dimensiune
    if (this.lungime && this.lungime < regulaSpecie.min) {
      alert(`⚠️ SUBDIMENSIUNE: ${this.specie} trebuie să aibă minim ${regulaSpecie.min} cm.`);
      return false;
    }

    // 3. Prohibiție
    if (this.dataCapturii) {
      let regulaDate;
      // Dacă specia are reguli explicite (ex: Știucă), le folosim
      if (regulaSpecie.prohibitie) {
        regulaDate = regulaSpecie.prohibitie[this.zonaDetectata];
      } 
      // Altfel, dacă e standard, folosim calendarul standard (General vs Frontieră)
      else if (regulaSpecie.standard) {
        regulaDate = PROHIBITIE_STANDARD[this.zonaDetectata as keyof typeof PROHIBITIE_STANDARD];
      }

      if (regulaDate) {
        const dataSelectata = new Date(this.dataCapturii);
        const an = dataSelectata.getFullYear();
        const start = new Date(`${an}-${regulaDate.s}`);
        const end = new Date(`${an}-${regulaDate.e}`);

        // Verificăm intervalul (inclusiv peste an pt Păstrăv)
        let inProhibitie = false;
        if (start <= end) {
            inProhibitie = dataSelectata >= start && dataSelectata <= end;
        } else {
            // Cazul când start > end (ex: Octombrie -> Martie)
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
    const userString = localStorage.getItem('user');
    if (!userString) { this.router.navigate(['/login']); return; }
    const user = JSON.parse(userString);

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