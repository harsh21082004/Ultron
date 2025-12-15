import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage } from '../../store/chat/chat.state';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatDbService {
  // This is the URL for your Node.js/Express backend
  private apiUrl: string = `${(environment as envType).apiUrl}/chats`;

  constructor(private http: HttpClient) {
    // console.log(this.apiUrl);
   }

  /**
   * Helper function to get the authentication headers with the JWT.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Saves the entire chat history to the database via the Express backend.
   * @param chatId The ID of the current chat session.
   * @param messages The array of all messages in the conversation.
   * @param title The title of the chat.
   */
  saveChat(chatId: string, messages: ChatMessage[], title: string): Observable<any> {
    const payload = { chatId, messages, title };
    
    // Makes a POST request to your Express server's /api/chats/save endpoint
    return this.http.post(`${this.apiUrl}/save`, payload, { headers: this.getAuthHeaders() });
  }

  /**
   * Fetches the chat history for a given chat ID from the database.
   * @param chatId The unique ID for the chat session.
   * @returns An Observable array of ChatMessages.
   */
  getChatHistory(chatId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/get/${chatId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllChats(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/get/all/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  searchChats(query: string): Observable<any[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<any[]>(`${this.apiUrl}/search`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  deleteAllChats(userId: string): Observable<any[]>{
    return this.http.delete<any[]>(`${this.apiUrl}/delete/all/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }
}