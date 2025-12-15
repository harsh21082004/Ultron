// src/app/core/services/vision-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

@Injectable({ providedIn: 'root' })
export class VisionApiService {
  private http = inject(HttpClient);
  private apiUrl = `${(environment as envType).fastApiUrl}/vision`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  analyzeImage(imageUrl: string, prompt?: string): Observable<{ result: string }> {
    return this.http.post<{ result: string }>(
      `${this.apiUrl}/analyze`,
      { image_url: imageUrl, prompt },
      { headers: this.getAuthHeaders() }
    );
  }
}
