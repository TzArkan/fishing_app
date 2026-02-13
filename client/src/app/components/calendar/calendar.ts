import { Component, Inject, PLATFORM_ID, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FishingService } from '../../services/fishing';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit {
  forecastDays: any[] = [];
  selectedDay: any = null;
  loading = false;
  
  // Harta
  showMapModal = false;
  private L: any = null;
  private map: any = null;
  private marker: any = null;
  selectedLat: number = 44.4268; // Default București
  selectedLng: number = 26.1025;

  // Grafic Config
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Productivitate Pescuit (%)',
        fill: true,
        tension: 0.4,
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.2)'
      }
    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    scales: {
        y: { min: 0, max: 100 }
    }
  };
  public lineChartLegend = true;

  constructor(
    private service: FishingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.getCurrentLocation();
  }

  getCurrentLocation() {
    if (isPlatformBrowser(this.platformId) && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        this.selectedLat = pos.coords.latitude;
        this.selectedLng = pos.coords.longitude;
        this.fetchForecast();
      });
    } else {
        this.fetchForecast();
    }
  }

  fetchForecast() {
    this.loading = true;
    this.service.getForecast(this.selectedLat, this.selectedLng).subscribe(data => {
      this.forecastDays = data;
      this.selectDay(data[0]);
      this.loading = false;
      this.closeMapModal(); // Folosim funcția de închidere care curăță harta
    });
  }

  selectDay(day: any) {
    this.selectedDay = day;
    
    const labels = day.hourlyData.map((h: any) => h.time);
    const scores = day.hourlyData.map((h: any) => h.score);

    this.lineChartData = {
        labels: labels,
        datasets: [{
            data: scores,
            label: `Productivitate - ${day.dayName}`,
            fill: true,
            tension: 0.4,
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.2)',
            pointBackgroundColor: '#27ae60'
        }]
    };
  }

  // --- LOGICA HĂRȚII MODIFICATĂ ---
  async openMapPicker() {
    this.showMapModal = true;
    if (isPlatformBrowser(this.platformId)) {
        if (!this.L) {
            this.L = await import('leaflet');
        }
        // Apelează initMap care acum are propriul setTimeout intern
        this.initMap();
    }
  }

  initMap() {
    // 1. Curățăm harta veche dacă există
    if (this.map) {
        this.map.remove();
        this.map = null;
    }

    // 2. Folosim setTimeout pentru a aștepta randarea DOM-ului
    setTimeout(() => {
        const mapElement = document.getElementById('picker-map');
        if (!mapElement) return;

        // 3. Creăm harta
        this.map = this.L.map('picker-map', {
            center: [this.selectedLat, this.selectedLng],
            zoom: 7
        });

        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
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

        // 4. Invalidate Size (cheia problemei)
        this.map.invalidateSize();
    }, 100);
  }

  // Funcție nouă pentru închidere curată (opțional, dar recomandat să o folosești în HTML)
  closeMapModal() {
      this.showMapModal = false;
      if (this.map) {
          this.map.remove();
          this.map = null;
      }
  }

  // Funcție de confirmare (dacă ai buton de confirmare în HTML)
  confirmLocation() {
      this.fetchForecast(); // Reîncarcă datele cu noua locație
      this.closeMapModal();
  }
}