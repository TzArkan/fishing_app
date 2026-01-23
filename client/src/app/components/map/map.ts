import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FishingService } from '../../services/fishing';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class Map implements OnInit, AfterViewInit {
  private map: any;
  private markersLayer: any; // <--- NOU: Un grup pentru markere
  
  currentUserId: number | null = null;
  private L: any = null;

  showAddModal = false;
  isAddMode = false;
  
  newSpotName = '';
  newSpotDetails = '';
  tempLatLng: any = null;

  constructor(
    private service: FishingService,
    private zone: NgZone, // <--- NOU: Avem nevoie de asta pentru a detecta click-ul din afara Angular
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
        const storedId = localStorage.getItem('userId');
        if (storedId) this.currentUserId = +storedId;
    }
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.L = await import('leaflet');
      
      // <--- TRUCUL MAGIC: Punem funcția de ștergere pe 'window' ca să o vadă butonul din HTML
      (window as any).deleteSpotGlobal = (id: number) => {
        // Folosim zone.run ca Angular să știe că s-a întâmplat ceva și să actualizeze pagina
        this.zone.run(() => this.deleteSpot(id));
      };

      this.initMap();
      this.loadSpots();
    }
  }

  private initMap(): void {
    this.map = this.L.map('map', {
      center: [45.9432, 24.9668],
      zoom: 7,
      zoomControl: false
    });

    this.L.control.zoom({ position: 'topleft' }).addTo(this.map);

    const satelliteLayer = this.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    });
    
    const labelsLayer = this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    });

    satelliteLayer.addTo(this.map);
    labelsLayer.addTo(this.map);

    // <--- NOU: Inițializăm stratul de markere
    this.markersLayer = this.L.layerGroup().addTo(this.map);

    this.map.on('click', (e: any) => {
      if (!this.isAddMode) return;
      this.tempLatLng = e.latlng;
      this.showAddModal = true;
      this.toggleAddMode(false);
    });

    this.fixLeafletIcons();
  }

  toggleAddMode(active: boolean) {
    this.isAddMode = active;
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.style.cursor = this.isAddMode ? 'crosshair' : 'grab';
    }
  }

  loadSpots() {
    if (!this.currentUserId || !this.L) return;

    // <--- NOU: Curățăm markerele vechi înainte să le punem pe cele noi (evităm dublurile)
    this.markersLayer.clearLayers();

    this.service.getSpots(this.currentUserId).subscribe((spots: any) => {
      spots.forEach((spot: any) => {
        const marker = this.L.marker([spot.latitude, spot.longitude]);
        
        // <--- AICI ESTE BUTONUL DE ȘTERGERE
        // Observă 'onclick="window.deleteSpotGlobal(...)"'
        const popupContent = `
          <div style="text-align: center;">
            <b style="font-size: 1.1em;">${spot.name}</b><br>
            <span style="color: #555;">${spot.details || ''}</span><br>
            <hr style="margin: 5px 0; border: 0; border-top: 1px solid #ccc;">
            <button onclick="window.deleteSpotGlobal(${spot.id})" 
                    style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🗑️ Șterge
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);
        
        // Adăugăm markerul în stratul nostru special
        this.markersLayer.addLayer(marker);
      });
    });
  }

  // <--- NOU: Funcția care șterge efectiv
  deleteSpot(id: number) {
    if (!confirm('Sigur vrei să ștergi acest loc?')) return;

    this.service.deleteSpot(id).subscribe({
      next: () => {
        this.loadSpots(); // Reîncărcăm harta ca să dispară pin-ul
        alert("Locație ștearsă.");
      },
      error: (err) => {
        console.error(err);
        alert("Eroare la ștergere.");
      }
    });
  }

  saveSpot() {
    if (!this.currentUserId || !this.tempLatLng || !this.L) return;

    const payload = {
      userId: this.currentUserId,
      name: this.newSpotName,
      details: this.newSpotDetails,
      latitude: this.tempLatLng.lat,
      longitude: this.tempLatLng.lng
    };

    this.service.saveSpot(payload).subscribe(() => {
      this.loadSpots(); // <--- Reîncărcăm totul curat
      this.showAddModal = false;
      this.newSpotName = '';
      this.newSpotDetails = '';
      alert("Locație salvată! 🎣");
    });
  }

  fixLeafletIcons() {
    if (!this.L) return;
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
    
    const iconDefault = this.L.icon({
      iconRetinaUrl, iconUrl, shadowUrl,
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
    });
    this.L.Marker.prototype.options.icon = iconDefault;
  }
}