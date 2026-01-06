import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ... importurile existente ...

@Injectable({ providedIn: 'root' })
export class FishingService {
  private apiUrl = 'http://localhost:5000/api'; // Am scos '/capturi' ca să fie baza

  constructor(private http: HttpClient) { }

  // Auth Methods
  register(userObj: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userObj);
  }

  stergeCaptura(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/capturi/${id}`);
  }

  editeazaCaptura(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/capturi/${id}`, data);
  }

  login(userObj: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, userObj);
  }

  adaugaCaptura(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/capturi`, data);
  }

  getCapturi(userId: number): Observable<any[]> {
    // Trimitem userId ca parametru în URL (?userId=...)
    return this.http.get<any[]>(`${this.apiUrl}/capturi?userId=${userId}`);
  }
}