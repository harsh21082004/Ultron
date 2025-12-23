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
import { Observable, Subscription, firstValueFrom, lastValueFrom, withLatestFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppState } from '../../../store';
import { ChatSelectors } from '../../../store/chat/chat.selectors';
import { ChatPageActions } from '../../../store/chat/chat.actions';
import { ChatMessage, StreamStatus } from '../../../store/chat/chat.state'; 
import { selectAuthUser } from '../../../store/auth/auth.selectors';
import { User } from '../../models/user.model';

import { ChatInputComponent, ChatMessageEvent } from '../../components/chat-input/chat-input';
import { ChatEmptyStateComponent } from '../../components/chat-empty-state/chat-empty-state';
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';
import { HeaderComponent } from '../header/header.component';
import { UltronLoaderComponent } from '../ultron-loader/ultron-loader.component';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { AudioApiService } from '../../../core/services/audio-api.service';
import { FileUploadService } from '../../../core/services/file-upload.service';

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
  @ViewChild('chatContainer') private chatContainer!: ElementRef; 
  @ViewChild(ChatInputComponent) private chatInputComponent!: ChatInputComponent;

  public messages$: Observable<ChatMessage[]>;
  public isLoading$: Observable<boolean>;
  public isStreaming$: Observable<boolean>;
  public streamStatus$: Observable<StreamStatus | null>; 
  public user$: Observable<User | null>;
  
  public isSharedChatView = false;
  public promptSuggestions = PROMPT_SUGGESTIONS;
  public isMobileView = false;
  
  private isInitialLoad = true; 

  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);
  private router = inject(Router); 
  private clipboard = inject(ClipboardService);
  private audioService = inject(AudioApiService); 
  private fileUploadService = inject(FileUploadService);

  private routeSub!: Subscription;
  private messagesSub!: Subscription;

  constructor() {
    this.messages$ = this.store.select(ChatSelectors.selectMessages);
    this.isLoading$ = this.store.select(ChatSelectors.selectIsLoading);
    this.isStreaming$ = this.store.select(ChatSelectors.selectIsStreaming);
    this.streamStatus$ = this.store.select(ChatSelectors.selectStreamStatus);
    this.user$ = this.store.select(selectAuthUser);

    this.updateIsMobileView();
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
      withLatestFrom(
        this.store.select(ChatSelectors.selectCurrentChatId),
        this.store.select(ChatSelectors.selectShareId)
      )
    ).subscribe(([params, currentLoadedChatId, currentShareId]) => {
      const urlChatId = params.get('id');
      const routeShareId = params.get('shareId');

      this.isInitialLoad = true;

      if (routeShareId) {
        this.isSharedChatView = true;
        this.store.dispatch(ChatPageActions.clearActiveChat());
        if (routeShareId !== currentShareId) {
             this.store.dispatch(ChatPageActions.loadSharedChat({ shareId: routeShareId }));
        }
      } else if (urlChatId) {
        this.isSharedChatView = false;
        if (currentShareId) this.store.dispatch(ChatPageActions.clearShareState());
        if (urlChatId !== currentLoadedChatId || !!currentShareId) {
          this.store.dispatch(ChatPageActions.enterChat({ chatId: urlChatId }));
        }
      } else {
        this.isSharedChatView = false;
        if (currentShareId) this.store.dispatch(ChatPageActions.clearShareState());
        this.store.dispatch(ChatPageActions.clearActiveChat());
      }
    });
  }

  ngAfterViewInit(): void {
    this.messagesSub = this.messageElements.changes.subscribe(() => {
      if (this.isInitialLoad && this.messageElements.length > 0) {
        this.scrollToBottom();
        this.isInitialLoad = false; 
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
  }

  public trackByMessage(_index: number, message: ChatMessage): string {
    return message._id;
  }

  // --- HELPER: Check if a message has actual text content ---
  // This prevents rendering an empty bubble if the user only sent an image
  public hasTextBlock(message: ChatMessage): boolean {
    return message.content.some(block => block.type === 'text' && block.value.trim().length > 0);
  }

  public async handleSendMessage(event: ChatMessageEvent): Promise<void> {
    let messageText = event.message;
    const files = event.files;
    
    let attachments: any[] = [];
    let base64Files: string[] = [];

    if (files.length > 0) {
      const base64Promises = files.map(file => this.fileToBase64(file));
      const uploadPromise = lastValueFrom(this.fileUploadService.upload(files, 'chat-media'));

      try {
        const [base64Results, uploadResult] = await Promise.all([
          Promise.all(base64Promises),
          uploadPromise
        ]);

        base64Files = base64Results;

        if (uploadResult && uploadResult.files) {
          attachments = uploadResult.files.map(f => ({
            type: f.mimeType.startsWith('image') ? 'image_url' : 'file',
            url: f.url,
            name: f.originalName
          }));
        }
      } catch (error) {
        console.error("Error processing files:", error);
        return; 
      }
    }

    this.processNewMessage(messageText, attachments, base64Files);
    setTimeout(() => this.scrollToLatestUserMessage(), 150);
  }

  public handleStopGeneration(): void {
    this.store.dispatch(ChatPageActions.stopStream());
  }

  public handleSuggestionClick(prompt: string): void {
    this.processNewMessage(prompt);
    setTimeout(() => this.scrollToLatestUserMessage(), 150);
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

  private processNewMessage(message: string, attachments: any[] = [], base64Files: string[] = []): void {
    let currentChatId = this.route.snapshot.paramMap.get('id');
    const newId = crypto.randomUUID();
    
    const payload = { 
      message: message.trim(), 
      chatId: currentChatId || newId,
      attachments,
      base64Files
    };

    this.store.dispatch(ChatPageActions.sendMessage(payload));

    if (!currentChatId) {
      this.router.navigate(['/chat', newId]);
    }
  }

  private getTextFromMessage(message: ChatMessage): string | null {
    return message.content
      .filter(b => b.type !== 'image_url' && b.type !== 'image') 
      .map(b => b.value)
      .join('\n');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
      }
    }, 100);
  }

  private scrollToLatestUserMessage(): void {
    try {
      const elements = this.messageElements.toArray();
      if (elements.length > 0) {
        const userMsgIndex = elements.length >= 2 ? elements.length - 2 : elements.length - 1;
        const targetElement = elements[userMsgIndex]?.nativeElement;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } catch (err) { console.warn("Scroll failed:", err); }
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