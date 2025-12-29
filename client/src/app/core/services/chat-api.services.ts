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
  type: 'text' | 'status' | 'log' | 'sources' | 'update_pref';
  value: string;
}

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private http = inject(HttpClient);
  private apiUrl: string = `${environment.fastApiUrl}/chat`;

  private getFetchAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || '';
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  }
  
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });
  }

  sendMessageStream(
    message: string, 
    chatId: string, 
    parentMessageId: string | null, // NEW param
    images: string[] = [], 
    language: string = 'English',
    userContext?: any
  ): Observable<StreamEvent> {
    return new Observable(subscriber => {
      const controller = new AbortController();
      const signal = controller.signal;

      const payload: any = { 
          message, chatId, parentMessageId, language, user_context: userContext, images 
      };

      fetch(`${this.apiUrl}/stream`, {
        method: 'POST', headers: this.getFetchAuthHeaders(), body: JSON.stringify(payload), signal
      }).then(async response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let currentTag: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) { subscriber.complete(); break; }

          const parts = value.split(/(?=(?:__STATUS__|__THOUGHT__|__SOURCES__|__ANSWER__|__UPDATE_PREF__):)/).filter(Boolean);
          for (const part of parts) {
            let processedPart = part;
            if (part.startsWith('__STATUS__:')) { currentTag = 'status'; processedPart = part.replace('__STATUS__:', ''); }
            else if (part.startsWith('__UPDATE_PREF__:')) { currentTag = 'update_pref'; processedPart = part.replace('__UPDATE_PREF__:', ''); }
            else if (part.startsWith('__THOUGHT__:')) { currentTag = 'log'; processedPart = part.replace('__THOUGHT__:', ''); }
            else if (part.startsWith('__SOURCES__:')) { currentTag = 'sources'; processedPart = part.replace('__SOURCES__:', ''); }
            else if (part.startsWith('__ANSWER__:')) { currentTag = 'text'; processedPart = part.replace('__ANSWER__:', ''); }

            const cleanValue = processedPart; 
            if (cleanValue) subscriber.next({ type: currentTag as any, value: cleanValue });
          }
        }
      }).catch(err => {
        if (err.name !== 'AbortError') subscriber.error(err);
        else subscriber.complete();
      });
      return () => controller.abort();
    });
  }

  generateTitle(messages: ChatMessage[]): Observable<{ title: string }> {
    return this.http.post<{ title: string }>(`${this.apiUrl}/generate-title`, { messages }, { headers: this.getAuthHeaders() });
  }

  hydrateHistory(chatId: string, messages: ChatMessage[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/hydrate-history`, { chatId, messages }, { headers: this.getAuthHeaders() });
  }
}