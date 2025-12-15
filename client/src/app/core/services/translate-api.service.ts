import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

@Injectable({ providedIn: 'root' })
export class TranslateApiService {
  private http = inject(HttpClient);
  private apiUrl = `${(environment as envType).fastApiUrl}/translate`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  translate(text: string, targetLanguage: string): Observable<{ translated_text: string }> {
    return this.http.post<{ translated_text: string }>(
      `${this.apiUrl}`,
      { text, target_language: targetLanguage },
      { headers: this.getAuthHeaders() }
    );
  }
}