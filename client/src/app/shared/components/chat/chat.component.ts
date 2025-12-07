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
import { Observable, Subscription, withLatestFrom } from 'rxjs';

// --- Material Imports ---
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// --- State Management ---
import { AppState } from '../../../store';
import * as ChatActions from '../../../store/chat/chat.actions';
import { 
  selectChatMessages, 
  selectCurrentChatId, 
  selectIsLoading, 
  selectIsStreaming 
} from '../../../store/chat/chat.selectors';
import { ChatMessage } from '../../../store/chat/chat.state';
import { selectAuthUser } from '../../../store/auth/auth.selectors';
import { User } from '../../models/user.model';

// --- Child Components & Services ---
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';
import { HeaderComponent } from '../header/header.component';
import { UltronLoaderComponent } from '../ultron-loader/ultron-loader.component';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { ChatInputComponent } from '../chat-input/chat-input';
import { ChatEmptyStateComponent } from '../chat-empty-state/chat-empty-state';

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
    // Custom Components
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

  // --- View Children ---
  @ViewChildren('messageElement') private messageElements!: QueryList<ElementRef>;
  @ViewChild(ChatInputComponent) private chatInputComponent!: ChatInputComponent;

  // --- State Observables ---
  public messages$: Observable<ChatMessage[]>;
  public isLoading$: Observable<boolean>;
  public isStreaming$: Observable<boolean>;
  public user$: Observable<User | null>;
  
  // --- Local State ---
  public promptSuggestions = PROMPT_SUGGESTIONS;
  public isMobileView = false;
  private scrollBehavior: ScrollLogicalPosition = 'start';

  // --- Services ---
  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clipboard = inject(ClipboardService);
  private routeSub!: Subscription;
  private messagesSub!: Subscription;

  constructor() {
    this.messages$ = this.store.select(selectChatMessages);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isStreaming$ = this.store.select(selectIsStreaming);
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
    // Robust Route Params Logic: Loads history or clears chat based on URL
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
    // Auto-scroll logic: triggered whenever the message list changes
    this.messagesSub = this.messageElements.changes.subscribe(() => {
      this.scrollToLastMessage();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
  }

  // --- Actions Handlers ---

  public trackByMessage(_index: number, message: ChatMessage): string {
    return message._id;
  }

  // Triggered by ChatInputComponent
  public handleSendMessage(message: string): void {
    this.scrollBehavior = 'start';
    this.processNewMessage(message);
  }

  // Triggered by ChatInputComponent
  public handleStopGeneration(): void {
    this.store.dispatch(ChatActions.stopStream());
  }

  // Triggered by ChatEmptyStateComponent
  public handleSuggestionClick(prompt: string): void {
    this.scrollBehavior = 'start';
    this.processNewMessage(prompt);
  }

  // User Action: Edit
  public onEditMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent && this.chatInputComponent) {
      // Use the input component's public method to set value and focus
      this.chatInputComponent.setJsonValue(textContent);
    }
  }

  // User Action: Copy
  public onCopyMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent) {
      this.clipboard.copyText(textContent);
    }
  }

  // --- Private Logic ---

  private processNewMessage(message: string): void {
    let currentChatId = this.route.snapshot.paramMap.get('id');

    if (currentChatId) {
      // Send to existing chat
      this.store.dispatch(ChatActions.sendMessage({ message, chatId: currentChatId }));
    } else {
      // Create new chat ID locally, then navigate
      const newChatId = crypto.randomUUID();
      this.store.dispatch(ChatActions.sendMessage({ message, chatId: newChatId }));
      this.router.navigate(['/chat', newChatId]);
    }
  }

  private getTextFromMessage(message: ChatMessage): string | null {
    return message.content
      .filter(b => b.type === 'text')
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
}