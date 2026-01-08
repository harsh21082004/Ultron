import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage } from '../../store/chat/chat.state';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

@Injectable({ providedIn: 'root' })
export class ChatDbService {
  private apiUrl: string = `${(environment as envType).apiUrl}/chats`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // This function sends the chat to the backend.
  // The backend will detect Base64 images in 'messages', upload them to GCS,
  // and swap them for URLs before saving to MongoDB.
  saveChat(chatId: string, messages: ChatMessage[], title: string, currentLeafId: string | null): Observable<any> {
    const payload = { chatId, messages, title, currentLeafId };

    console.log('Saving chat with payload:', payload);
    
    // NOTE: This POST request might be large (due to Base64). 
    // Ensure your Node.js body-parser limit is high enough (e.g., 50mb).
    return this.http.post(`${this.apiUrl}/save`, payload, { headers: this.getAuthHeaders() });
  }

  getChatHistory(chatId: string): Observable<{ messages: ChatMessage[], currentLeafId: string }> {
    return this.http.get<{ messages: ChatMessage[], currentLeafId: string }>(`${this.apiUrl}/get/${chatId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ... (Rest of your methods remain exactly the same) ...
  getAllChats(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get/all/${userId}`, { headers: this.getAuthHeaders() });
  }

  searchChats(query: string): Observable<any[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<any[]>(`${this.apiUrl}/search`, { headers: this.getAuthHeaders(), params });
  }

  deleteAllChats(userId: string): Observable<any[]>{
    return this.http.delete<any[]>(`${this.apiUrl}/delete/all/${userId}`, { headers: this.getAuthHeaders() });
  }

  createShareLink(chatId: string): Observable<{ shareId: string; shareUrl: string }> {
    return this.http.post<{ shareId: string; shareUrl: string }>(`${this.apiUrl}/share/create`, { chatId }, { headers: this.getAuthHeaders() });
  }

  getSharedPreview(shareId: string): Observable<{ shareId: string; title: string; messages: []; createdAt: Date; currentLeafId: string }> {
    return this.http.get<any>(`${this.apiUrl}/share/${shareId}/preview`);
  }

  importSharedChat(shareId: string): Observable<{ chatId: string }> { 
    return this.http.post<{ chatId: string }>(`${this.apiUrl}/share/${shareId}/import`, {}, { headers: this.getAuthHeaders() });
  }
}