import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

@Injectable({ providedIn: 'root' })
export class AudioApiService {
  private http = inject(HttpClient);
  private apiUrl = `${(environment as envType).fastApiUrl}/audio`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  transcribe(file: File): Observable<{ text: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ text: string }>(
      `${this.apiUrl}/transcribe`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }
}