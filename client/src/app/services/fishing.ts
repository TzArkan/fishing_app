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

  login(userObj: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, userObj);
  }

  // Metodele vechi (ATENȚIE: am actualizat URL-ul aici)
  adaugaCaptura(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/capturi`, data);
  }

  getCapturi(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/capturi`);
  }
}