import { 
  Component, 
  ElementRef, 
  ViewChild, 
  ChangeDetectionStrategy, 
  inject, 
  OnInit, 
  OnDestroy, 
  AfterViewInit, 
  ViewChildren, 
  QueryList, 
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, firstValueFrom, withLatestFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppState } from '../../../store';
import * as ChatActions from '../../../store/chat/chat.actions';
import { 
  selectChatMessages, 
  selectCurrentChatId, 
  selectIsLoading, 
  selectIsStreaming 
} from '../../../store/chat/chat.selectors';
import { ChatMessage, StreamStatus } from '../../../store/chat/chat.state'; // Ensure StreamStatus is imported
import { selectAuthUser } from '../../../store/auth/auth.selectors';
import { User } from '../../models/user.model';

import { ChatInputComponent, ChatMessageEvent } from '../../components/chat-input/chat-input';
import { ChatEmptyStateComponent } from '../../components/chat-empty-state/chat-empty-state';
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';
import { HeaderComponent } from '../header/header.component';
import { UltronLoaderComponent } from '../ultron-loader/ultron-loader.component';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { AudioApiService } from '../../../core/services/audio-api.service';

const PROMPT_SUGGESTIONS = [
  { title: "Smart Budget", description: "A budget that fits your lifestyle." },
  { title: "Analytics", description: "Empower smarter decisions." },
  { title: "Spending", description: "Track your financial resources." },
  { title: "Coding", description: "Learn how to use several coding languages." },
  { title: "Jobs", description: "Track your learnings required for getting a job" },
];

@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatTooltipModule,
    HeaderComponent,
    ContentRendererComponent,
    UltronLoaderComponent,
    ChatInputComponent,
    ChatEmptyStateComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChildren('messageElement') private messageElements!: QueryList<ElementRef>;
  @ViewChild(ChatInputComponent) private chatInputComponent!: ChatInputComponent;

  public messages$: Observable<ChatMessage[]>;
  public isLoading$: Observable<boolean>;
  public isStreaming$: Observable<boolean>;
  
  // UPDATED: Typed to StreamStatus object (current string + steps array)
  public streamStatus$: Observable<StreamStatus | null>; 
  
  public user$: Observable<User | null>;
  
  public promptSuggestions = PROMPT_SUGGESTIONS;
  public isMobileView = false;
  
  // NEW: Toggle state for reasoning logs dropdown
  public showReasoningLogs = false; 
  
  private scrollBehavior: ScrollLogicalPosition = 'start';

  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clipboard = inject(ClipboardService);
  private audioService = inject(AudioApiService); 
  
  private routeSub!: Subscription;
  private messagesSub!: Subscription;

  constructor() {
    this.messages$ = this.store.select(selectChatMessages);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isStreaming$ = this.store.select(selectIsStreaming);
    this.user$ = this.store.select(selectAuthUser);
    
    // Select the full status object from state
    this.streamStatus$ = this.store.select((state: any) => state.chat.streamStatus);

    this.streamStatus$.subscribe(status => { console.log(status)})

    this.updateIsMobileView();
  }

  // NEW: Toggle method for the UI
  toggleReasoningLogs(): void {
    this.showReasoningLogs = !this.showReasoningLogs;
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobileView();
  }

  private updateIsMobileView() {
    this.isMobileView = window.innerWidth <= 840;
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.pipe(
      withLatestFrom(this.store.select(selectCurrentChatId))
    ).subscribe(([params, currentLoadedChatId]) => {
      const urlChatId = params.get('id');
      
      if (urlChatId) {
        if (urlChatId !== currentLoadedChatId) {
          this.store.dispatch(ChatActions.loadChatHistory({ chatId: urlChatId }));
        }
      } else {
        if (currentLoadedChatId !== null) {
          this.store.dispatch(ChatActions.clearActiveChat());
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.messagesSub = this.messageElements.changes.subscribe(() => {
      this.scrollToLastMessage();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
  }

  public trackByMessage(_index: number, message: ChatMessage): string {
    return message._id;
  }

  public async handleSendMessage(event: ChatMessageEvent): Promise<void> {
    this.scrollBehavior = 'center';
    this.scrollToLastMessage();
    this.showReasoningLogs = false; // Reset logs view on new message
    
    let finalMessage = event.message;
    let base64Image: string | undefined = undefined;

    if (event.files && event.files.length > 0) {
      for (const file of event.files) {
        if (file.type.startsWith('audio')) {
          try {
            const res = await firstValueFrom(this.audioService.transcribe(file));
            finalMessage += ` ${res.text}`; 
          } catch (err) {
            console.error('Transcription failed', err);
          }
        } 
        else if (file.type.startsWith('image')) {
          try {
            base64Image = await this.fileToBase64(file);
          } catch (err) {
            console.error('Image processing failed', err);
          }
        }
      }
    }

    this.processNewMessage(finalMessage, base64Image);
  }

  public handleStopGeneration(): void {
    this.store.dispatch(ChatActions.stopStream());
  }

  public handleSuggestionClick(prompt: string): void {
    this.scrollBehavior = 'start';
    this.processNewMessage(prompt);
  }

  public onEditMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent && this.chatInputComponent) {
      this.chatInputComponent.setJsonValue(textContent);
    }
  }

  public onCopyMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent) {
      this.clipboard.copyText(textContent);
    }
  }

  private processNewMessage(message: string, image?: string): void {
    let currentChatId = this.route.snapshot.paramMap.get('id');
    const newId = crypto.randomUUID();
    const payload = { 
      message: message.trim(), 
      chatId: currentChatId || newId,
      image 
    };

    if (currentChatId) {
      this.store.dispatch(ChatActions.sendMessage(payload));
    } else {
      this.store.dispatch(ChatActions.sendMessage(payload));
      this.router.navigate(['/chat', newId]);
    }
  }

  private getTextFromMessage(message: ChatMessage): string | null {
    return message.content
      .filter(b => b.type !== 'image_url' && b.type !== 'image') 
      .map(b => b.value)
      .join('\n');
  }

  private scrollToLastMessage(): void {
    setTimeout(() => {
      try {
        const lastElement = this.messageElements.last?.nativeElement;
        if (lastElement) {
          lastElement.scrollIntoView({
            behavior: 'smooth',
            block: this.scrollBehavior
          });
          this.scrollBehavior = 'start';
        }
      } catch (err) {
        console.warn("Error scrolling:", err);
      }
    }, 310);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}