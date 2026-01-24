import { Component, Inject, PLATFORM_ID, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FishingService } from '../../services/fishing';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'; // Import nou

// Important: În main.ts sau app.config.ts trebuie adăugat provideCharts(withDefaultRegisterables())
// Dar putem face importul direct aici pentru Chart.js
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
    // Încercăm să luăm locația curentă la start
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
        this.fetchForecast(); // Folosim default
    }
  }

  fetchForecast() {
    this.loading = true;
    this.service.getForecast(this.selectedLat, this.selectedLng).subscribe(data => {
      this.forecastDays = data;
      this.selectDay(data[0]); // Selectăm prima zi default
      this.loading = false;
      this.showMapModal = false; // Închidem harta dacă era deschisă
    });
  }

  selectDay(day: any) {
    this.selectedDay = day;
    
    // Actualizăm Graficul
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

  // --- LOGICA HĂRȚII DE SELECȚIE ---
  async openMapPicker() {
    this.showMapModal = true;
    if (isPlatformBrowser(this.platformId) && !this.L) {
        this.L = await import('leaflet');
        setTimeout(() => this.initMap(), 100); // Mic delay ca să se randeze div-ul
    }
  }

  initMap() {
    if(this.map) {
        this.map.remove(); // Curățăm harta veche dacă există
    }
    
    this.map = this.L.map('picker-map', {
        center: [this.selectedLat, this.selectedLng],
        zoom: 7
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    
    // Punem marker pe poziția curentă
    this.marker = this.L.marker([this.selectedLat, this.selectedLng], {draggable: true}).addTo(this.map);

    // Când userul dă click pe hartă, mutăm markerul
    this.map.on('click', (e: any) => {
        this.marker.setLatLng(e.latlng);
        this.selectedLat = e.latlng.lat;
        this.selectedLng = e.latlng.lng;
    });

    // Când userul trage markerul
    this.marker.on('dragend', (e: any) => {
        const pos = this.marker.getLatLng();
        this.selectedLat = pos.lat;
        this.selectedLng = pos.lng;
    });
  }
}