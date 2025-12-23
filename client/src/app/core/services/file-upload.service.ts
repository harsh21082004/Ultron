import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

export interface UploadedFile {
  originalName: string;
  mimeType: string;
  url: string;
  size: number;
}

export interface UploadResponse {
  message: string;
  count: number;
  files: UploadedFile[];
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private http = inject(HttpClient);
  private apiUrl: string = `${(environment as envType).apiUrl}/upload`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    // NOTE: Do NOT set 'Content-Type': 'multipart/form-data'. 
    // The browser sets this automatically with the correct boundary when using FormData.
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Uploads one or more files to the server.
   * @param files - A single File or an array of Files (File[]).
   * @param type - Organization folder (e.g., 'profile', 'chat', 'documents').
   */
  upload(files: File | File[], type: string = 'general'): Observable<UploadResponse> {
    const formData = new FormData();
    const fileArray = Array.isArray(files) ? files : [files];

    // Append all files to the same key 'files' (matching backend upload.array('files'))
    fileArray.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<UploadResponse>(
      `${this.apiUrl}?type=${type}`, 
      formData, 
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Uploads with Progress Report (Optional)
   * Use this if you want to show a progress bar (0% -> 100%).
   */
  uploadWithProgress(files: File | File[], type: string = 'general'): Observable<number | UploadResponse> {
    const formData = new FormData();
    const fileArray = Array.isArray(files) ? files : [files];

    fileArray.forEach(file => formData.append('files', file));

    return this.http.post<UploadResponse>(
      `${this.apiUrl}?type=${type}`, 
      formData, 
      { 
        headers: this.getAuthHeaders(),
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            // Return percentage number
            return Math.round((100 * event.loaded) / (event.total || 1));
          case HttpEventType.Response:
            // Return final body
            return event.body as UploadResponse;
          default:
            return 0; // Starting/Intermediate state
        }
      })
    );
  }
}