import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FishingService {
  
  // AICI ESTE REZOLVAREA: Definim variabila ca proprietate a clasei
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // --- AUTH ---
  register(user: any, code: string) {
 
  const payload = { ...user, code }; 
  return this.http.post(`${this.baseUrl}/register`, payload);
}

sendVerificationCode(nume: string, email: string) {
  // Trimitem obiectul { nume: "Ion", email: "ion@test.ro" }
  return this.http.post(`${this.baseUrl}/send-code`, { nume, email });
}
  login(user: any) {
    return this.http.post<any>(`${this.baseUrl}/login`, user);
  }

  publishCaptura(id: number) {
    // Apelăm ruta PUT creată în server
    return this.http.put(`${this.baseUrl}/capturi/${id}/publish`, {});
  }

  getFeed() {
    return this.http.get(`${this.baseUrl}/feed`);
  }
  // --- CAPTURI ---
  
  // Adaugă o captură
  addCaptura(formData: FormData) {
    return this.http.post(`${this.baseUrl}/capturi`, formData);
  }

  // Ia toate capturile unui user
  getCapturiUser(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/capturi?userId=${userId}`);
  }

  // Șterge captura
  deleteCaptura(id: number) {
    return this.http.delete(`${this.baseUrl}/capturi/${id}`);
  }

  // --- METODELE NOI PENTRU EDITARE ---

  // 1. Ia o singură captură (pentru a pre-completa formularul)
  getCatchById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/capturi/single/${id}`);
  }

  // 2. Actualizează captura (PUT)
  updateCatch(id: number, data: any) {
    return this.http.put(`${this.baseUrl}/capturi/${id}`, data);
  }

  // --- PROFIL ---
  
  getProfile(userId: number): Observable<any> {
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
}