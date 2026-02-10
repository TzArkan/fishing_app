import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; 
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FishingService {
  
  private baseUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  // --- AUTH ---
  register(user: any, code: string) {
    const payload = { ...user, code }; 
    return this.http.post(`${this.baseUrl}/register`, payload);
  }

  sendVerificationCode(nume: string, email: string) {
    return this.http.post(`${this.baseUrl}/send-code`, { nume, email });
  }

  login(user: any) {
    return this.http.post<any>(`${this.baseUrl}/login`, user);
  }

  getFeed(): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]); 
    }
    let userId = 0;
    const stored = localStorage.getItem('userId');
    if (stored) {
        userId = +stored;
    }
    const timestamp = Date.now(); 
    
    return this.http.get(`${this.baseUrl}/feed?userId=${userId}&ts=${timestamp}`);
  }

  // --- LIKE SYSTEM ---
  toggleLike(capturaId: number, userId: number) {
    return this.http.post(`${this.baseUrl}/capturi/${capturaId}/like`, { userId });
  }

  // --- COMMENT SYSTEM ---
  addComment(capturaId: number, userId: number, text: string) {
    return this.http.post(`${this.baseUrl}/capturi/${capturaId}/comments`, { userId, text });
  }

  // --- CAPTURI ---
  publishCaptura(id: number) {
    return this.http.put(`${this.baseUrl}/capturi/${id}/publish`, {});
  }

  addCaptura(formData: FormData) {
    return this.http.post(`${this.baseUrl}/capturi`, formData);
  }

  getCapturiUser(userId: number): Observable<any[]> {
    // Putem proteja și aici, opțional, dar Feed-ul era cel critic
    if (!isPlatformBrowser(this.platformId)) return of([]);
    return this.http.get<any[]>(`${this.baseUrl}/capturi?userId=${userId}`);
  }

deleteCaptura(id: number, adminId?: number) {
    // Trimitem adminId ca parametru (query param)
    let url = `${this.baseUrl}/capturi/${id}`;
    if (adminId) {
        url += `?adminId=${adminId}`;
    }
    return this.http.delete(url);
  }
  getCatchById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/capturi/single/${id}`);
  }

  updateCatch(id: number, data: any) {
    return this.http.put(`${this.baseUrl}/capturi/${id}`, data);
  }

  // --- PROFIL ---
  getProfile(userId: number): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) return of(null);
    return this.http.get(`${this.baseUrl}/profile/${userId}`);
  }

  updateProfile(userId: number, data: any) {
    return this.http.put(`${this.baseUrl}/profile/${userId}`, data);
  }

  uploadAvatar(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post(`${this.baseUrl}/profile/avatar/${userId}`, formData);
  }

  saveSpot(spotData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/spots`, spotData);
  }

  getSpots(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/spots?userId=${userId}`);
  }

  deleteSpot(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/spots/${id}`);
  }

  getForecast(lat: number, lng: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/forecast`, { latitude: lat, longitude: lng });
  }

  requestPasswordReset(email: string) {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  confirmPasswordReset(data: any) {
    return this.http.post(`${this.baseUrl}/reset-password`, data);
  }
  
  sendReport(reportData: any) {
    return this.http.post(`${this.baseUrl}/reports`, reportData);
  }

  // Adaugă metoda pentru admin (să vadă rapoartele)
  getAllReports(): Observable<any> { // Am adaugat tipul returnat pentru siguranță
    if (!isPlatformBrowser(this.platformId)) {
        // ⚠️ AICI AM MODIFICAT: Returnăm [] în loc de null ca să nu crape tabelul
        return of([]); 
    }
    return this.http.get(`${this.baseUrl}/reports`);
  }

  // Adaugă metoda pentru a actualiza statusul
  updateReportStatus(id: number, status: string) {
    return this.http.put(`${this.baseUrl}/reports/${id}`, { status });
  }

}