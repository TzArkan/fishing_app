import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FishingService } from '../../services/fishing'; // Verifică calea

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  
  reports: any[] = [];
  isLoading = true;

  constructor(private service: FishingService) {}

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.isLoading = true;
    this.service.getAllReports().subscribe({
      next: (data: any) => {
        this.reports = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Acțiune: Confirmă braconajul
  verifyReport(id: number) {
    if(!confirm('Confirmi această sesizare?')) return;
    
    this.service.updateReportStatus(id, 'verified').subscribe(() => {
      this.loadReports(); // Reîmprospătăm lista
      alert('Raport marcat ca Verificat! ✅');
    });
  }

  // Acțiune: Respinge (Falsă alarmă)
  rejectReport(id: number) {
    if(!confirm('Respingi această sesizare?')) return;

    this.service.updateReportStatus(id, 'rejected').subscribe(() => {
      this.loadReports();
      alert('Raport respins! ❌');
    });
  }

  // Deschide Google Maps cu coordonatele
  openGoogleMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  }
}