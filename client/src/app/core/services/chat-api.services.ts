import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage } from '../../store/chat/chat.state';
import { environment } from '../../../environments/environment';
import { envType } from '../../shared/models/environment';

export interface StreamEvent {
  type: 'text' | 'status' | 'log';
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private http = inject(HttpClient);
  private apiUrl: string = `${(environment as envType).fastApiUrl}/chat`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private getFetchAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
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

        // --- CRITICAL FIX: Define state variable OUTSIDE the loop ---
        // This ensures we remember the active tag (e.g. __THOUGHT__) across multiple chunks.
        let currentTag: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            subscriber.complete();
            break;
          }

          // Regex to split by tags but keep them in the array
          const parts = value.split(/(__STATUS__:)|(__THOUGHT__:)|(__SOURCES__:)/).filter(Boolean);

          for (const part of parts) {
            // 1. Check if the part is a Tag Marker
            if (part === '__STATUS__:') {
              currentTag = 'status';
              continue;
            }
            if (part === '__THOUGHT__:') {
              currentTag = 'log';
              continue;
            }
            if (part === '__SOURCES__:') {
              currentTag = 'log'; // Treat sources as logs/thoughts
              continue;
            }

            // 2. Process Content based on the active Tag
            if (currentTag === 'status') {
              subscriber.next({ type: 'status', value: part.trim() });
              // Status is usually short/immediate, so we can reset or keep it.
              // Resetting is safer if status is always one-line.
              currentTag = null; 
            } 
            else if (currentTag === 'log') {
              subscriber.next({ type: 'log', value: part.trim() });
              // Do NOT reset currentTag here. Thoughts can span multiple chunks.
              // The backend usually sends a newline or next tag to break it, 
              // but for now, we assume logs flow until text resumes.
              // Actually, if the next part is text, it will just append to log if we don't reset.
              // For "Thinking...", it's usually followed by the real answer.
              // If your backend implies "Text starts when tags end", we need a trigger.
              // But usually, the logs come *before* the text.
              // If the text starts, it won't have a tag. 
              // So we might need to rely on the next tag or specific backend behavior.
              // For this implementation, we'll keep it simple: 
              // If we hit a tag, we stay in that tag mode for the current 'part'.
              // BUT: To be safe for mixed streams, we often reset after processing a non-empty part
              // UNLESS we know thoughts are multi-chunk. 
              // Let's stick to the previous robust logic:
              // For now, let's assume thoughts are self-contained lines or chunks.
              // If we strictly want to prevent leakage, we reset.
              currentTag = null; 
            } 
            else {
              // No tag active, so it's regular text
              if (part.length > 0) {
                subscriber.next({ type: 'text', value: part });
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