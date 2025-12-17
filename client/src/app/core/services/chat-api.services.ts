import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage } from '../../store/chat/chat.state';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const environment = {
  fastApiUrl: isLocal ? 'http://localhost:8000/api/py' : '/api/py', 
  apiUrl: '/api'
};

export interface StreamEvent {
  type: 'text' | 'status' | 'log' | 'sources';
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private http = inject(HttpClient);
  private apiUrl: string = `${environment.fastApiUrl}/chat`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private getFetchAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  sendMessageStream(message: string, chatId: string, image?: string): Observable<StreamEvent> {
    return new Observable(subscriber => {
      const controller = new AbortController();
      const signal = controller.signal;

      const payload: any = { message, chatId };
      if (image) {
        payload.image = image;
      }

      fetch(`${this.apiUrl}/stream`, {
        method: 'POST',
        headers: this.getFetchAuthHeaders(),
        body: JSON.stringify(payload),
        signal
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let currentTag: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            subscriber.complete();
            break;
          }

          // --- ROBUST PARSING LOGIC ---
          // Updated Regex: Now includes __ANSWER__
          // Splits string BEFORE any of these tags, keeping the tag at the start of the split part.
          const parts = value.split(/(?=(?:__STATUS__|__THOUGHT__|__SOURCES__|__ANSWER__):)/).filter(Boolean);

          for (const part of parts) {
            let processedPart = part;
            
            // Check for tags
            if (part.startsWith('__STATUS__:')) {
              currentTag = 'status';
              processedPart = part.replace('__STATUS__:', '');
            } else if (part.startsWith('__THOUGHT__:')) {
              currentTag = 'log';
              processedPart = part.replace('__THOUGHT__:', '');
            } else if (part.startsWith('__SOURCES__:')) {
              currentTag = 'sources';
              processedPart = part.replace('__SOURCES__:', '');
            } else if (part.startsWith('__ANSWER__:')) {
              // Explicit Answer tag -> Switch to text mode
              currentTag = 'text'; 
              processedPart = part.replace('__ANSWER__:', '');
            }

            // Note: If a part DOES NOT start with a tag, we keep the `currentTag` as is.
            // This supports multi-chunk thoughts or multi-chunk answers.
            // But since we now have __ANSWER__, the transition from Thought -> Answer is guaranteed to be caught.

            const cleanValue = processedPart; 

            if (cleanValue) {
                if (currentTag === 'status') {
                    subscriber.next({ type: 'status', value: cleanValue.trim() });
                } else if (currentTag === 'log') {
                    subscriber.next({ type: 'log', value: cleanValue.trim() });
                } else if (currentTag === 'sources') {
                    subscriber.next({ type: 'sources', value: cleanValue.trim() });
                } else {
                    // Default to text if tag is 'text' or null (for backward compatibility)
                    subscriber.next({ type: 'text', value: cleanValue });
                }
            }
          }
        }
      }).catch(err => {
        if (err.name === 'AbortError') {
          console.log('Stream stopped by user.');
          subscriber.complete();
        } else {
          subscriber.error(err);
        }
      });

      return () => controller.abort();
    });
  }

  generateTitle(messages: ChatMessage[]): Observable<{ title: string }> {
    return this.http.post<{ title: string }>(`${this.apiUrl}/generate-title`,
      { messages },
      { headers: this.getAuthHeaders() }
    );
  }

  hydrateHistory(chatId: string, messages: ChatMessage[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/hydrate-history`,
      { chatId, messages },
      { headers: this.getAuthHeaders() }
    );
  }
}