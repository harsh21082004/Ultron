import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage } from '../../store/chat/chat.state';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private http = inject(HttpClient);
  // This is the URL for your FastAPI backend
  private apiUrl: string = `${(environment as envType).fastApiUrl}/chat`;

  /**
   * Helper for POST/PUT requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    // Note: 'Content-Type' is set for HttpClient.
    // fetch API sets its own content-type for JSON.
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Helper for fetch API, returns headers as an object
   */
  private getFetchAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  constructor (){
    console.log(this.apiUrl);
  }

  /**
   * --- CORRECTED ---
   * Sends the message AND the chatId to the streaming POST endpoint.
   * This uses the fetch API to correctly handle a streaming POST response.
   */
  sendMessageStream(message: string, chatId: string): Observable<string> {

    return new Observable(subscriber => {
      const controller = new AbortController();

      fetch(`${this.apiUrl}/stream`, {
        method: 'POST',
        headers: this.getFetchAuthHeaders(),
        body: JSON.stringify({ message, chatId }), // Send both message and chatId
        signal: controller.signal
      }).then(async response => {
        if (!response.ok) {
          // Handle HTTP errors (like 4xx, 5xx)
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No response body");
        }

        // Use TextDecoderStream to handle UTF-8 text chunks
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            subscriber.complete();
            break;
          }
          // The service returns one token at a time
          subscriber.next(value);
        }
      }).catch(err => {
        if (err.name !== 'AbortError') {
          subscriber.error(err);
        }
      });

      // On unsubscribe (e.g., component destroyed), abort the fetch request
      return () => controller.abort();
    });
  }

  /**
   * Calls the FastAPI backend to generate a title for a given chat history.
   */
  generateTitle(messages: ChatMessage[]): Observable<{ title: string }> {
    return this.http.post<{ title: string }>(`${this.apiUrl}/generate-title`,
      { messages },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Sends the full chat history to the FastAPI backend to hydrate the AI's memory.
   */
  hydrateHistory(chatId: string, messages: ChatMessage[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/hydrate-history`,
      { chatId, messages },
      { headers: this.getAuthHeaders() }
    );
  }
}

