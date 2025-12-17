import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage } from '../../store/chat/chat.state';
// import { environment } from '../../../environments/environment';
// import { envType } from '../../shared/models/environment';

// --- LOCAL ENVIRONMENT FIX ---
// Detects if running on localhost to switch between direct backend access vs Nginx proxy
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const environment = {
  // If local, use direct FastAPI port (8000). If prod, use Nginx proxy path.
  fastApiUrl: isLocal ? 'http://localhost:8000/api/py' : '/api/py', 
  apiUrl: '/api'
};

// Mock type for the local environment definition
type envType = typeof environment;

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

  /**
   * Connects to the backend stream and parses custom tags (__STATUS__, __THOUGHT__)
   * into structured StreamEvents. Handles mixed chunks (Text + Tag).
   */
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

        // State to track the active tag across chunks
        let currentTag: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            subscriber.complete();
            break;
          }

          // --- ROBUST PARSING LOGIC ---
          // Use lookahead regex to split string at the start of any new tag
          // This keeps the tag with its content in the same part
          const parts = value.split(/(?=(?:__STATUS__|__THOUGHT__|__SOURCES__):)/).filter(Boolean);

          for (const part of parts) {
            let processedPart = part;
            let newTagFound = false;
            
            // Check if this part starts with a known tag
            if (part.startsWith('__STATUS__:')) {
              currentTag = 'status';
              processedPart = part.replace('__STATUS__:', '');
              newTagFound = true;
            } else if (part.startsWith('__THOUGHT__:')) {
              currentTag = 'log';
              processedPart = part.replace('__THOUGHT__:', '');
              newTagFound = true;
            } else if (part.startsWith('__SOURCES__:')) {
              currentTag = 'sources'; // Separate type for sources so UI can parse JSON and render cards
              processedPart = part.replace('__SOURCES__:', '');
              newTagFound = true;
            } 

            // FIX: If we are in a special tag mode (status/log/sources), but the current part 
            // does NOT start with a new tag, it implies the stream has transitioned 
            // back to the standard text response (which often comes without a tag).
            // We force a reset to text mode here to prevent "swallowing" the answer into the logs.
            if (!newTagFound && currentTag !== null) {
               currentTag = null;
            }

            // Logic: If currentTag is set, this text belongs to that tag (e.g. status or thought).
            // If NO tag is set (or we just switched context implied by stream structure), it's the AI response.
            
            const cleanValue = processedPart; 

            if (cleanValue) {
                if (currentTag === 'status') {
                    subscriber.next({ type: 'status', value: cleanValue.trim() });
                } else if (currentTag === 'log') {
                    subscriber.next({ type: 'log', value: cleanValue.trim() });
                } else if (currentTag === 'sources') {
                    subscriber.next({ type: 'sources', value: cleanValue.trim() });
                } else {
                    // No tag active -> It's the AI response
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