import { Component, ElementRef, ViewChild, ChangeDetectionStrategy, inject, OnInit, OnDestroy, AfterViewInit, ViewChildren, QueryList, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, withLatestFrom } from 'rxjs';

// --- Angular Material Imports ---
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

// --- NgRx State Imports ---
import { AppState } from '../../../store';
import * as ChatActions from '../../../store/chat/chat.actions';
import { selectChatMessages, selectCurrentChatId, selectIsLoading } from '../../../store/chat/chat.selectors';
import { ChatMessage } from '../../../store/chat/chat.state';
import { selectAuthUser } from '../../../store/auth/auth.selectors';

// --- Shared Component Imports ---
import { AutoGrowDirective } from '../../../shared/directives/auto-grow.directive';
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';
import { HeaderComponent } from '../header/header.component';
import { UltronLoaderComponent } from '../ultron-loader/ultron-loader.component';
import { User } from '../../models/user.model';

// --- Constants ---
const PROMPT_SUGGESTIONS = [
  { title: "Smart Budget", description: "A budget that fits your lifestyle." },
  { title: "Analytics", description: "Empower smarter decisions." },
  { title: "Spending", "description": "Track your financial resources." },
  { title: "Coding", "description": "Learn how to use several coding languages." },
  { title: "Jobs", "description": "Track your learnings required for getting  job" },
];

// Custom Validator function
export function noWhitespaceValidator(control: any) {
  const isWhitespace = (control.value || '').trim().length === 0;
  return isWhitespace ? { 'whitespace': true } : null;
}

@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatProgressSpinnerModule, ContentRendererComponent, HeaderComponent,
    UltronLoaderComponent, AutoGrowDirective,
    MatTooltipModule
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChildren('messageElement') private messageElements!: QueryList<ElementRef>;
  @ViewChild(AutoGrowDirective) private autoGrowDirective?: AutoGrowDirective;
  @ViewChild('chatTextarea') private chatTextarea!: ElementRef<HTMLTextAreaElement>;

  // --- Public Properties ---
  public messages$: Observable<ChatMessage[]>;
  public isLoading$: Observable<boolean>;
  public user$: Observable<User | null>;
  public chatForm: FormGroup;
  public promptSuggestions = PROMPT_SUGGESTIONS;
  public isMobileView = false;

  // --- Private Properties ---
  private store = inject(Store<AppState>);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private routeSub!: Subscription;
  private messagesSub!: Subscription;
  private scrollBehavior: ScrollLogicalPosition = 'start';

  constructor() {
    this.messages$ = this.store.select(selectChatMessages);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.user$ = this.store.select(selectAuthUser);
    this.isMobileView = window.innerWidth <= 840;

    this.chatForm = this.fb.group({
      message: ['', [Validators.required, noWhitespaceValidator]],
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobileView();        // update on any resize (including DevTools device toggle)
  }

  private updateIsMobileView() {
    this.isMobileView = window.innerWidth <= 840;
  }

  ngOnInit(): void {
    // --- THIS IS THE ROBUST FIX ---
    this.routeSub = this.route.paramMap.pipe(
      // Get the *currently loaded* chat ID from the store
      withLatestFrom(this.store.select(selectCurrentChatId))
    ).subscribe(([params, currentLoadedChatId]) => {
      
      const urlChatId = params.get('id');
      
      if (urlChatId) {
        // A chat ID exists in the URL
        
        // We ONLY load history if the URL ID is *different*
        // from the one we already have in the store.
        if (urlChatId !== currentLoadedChatId) {
          this.store.dispatch(ChatActions.loadChatHistory({ chatId: urlChatId }));
        }
        
      } else {
        // We are on the "new chat" page (e.g., /chat).
        
        // We ONLY clear the chat if we don't *already* have a clear state
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
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.messagesSub) {
      this.messagesSub.unsubscribe();
    }
  }

  // --- Public Methods (from Template) ---

  public trackByMessage(_index: number, message: ChatMessage): string {
    return message._id;
  }

  public stopGeneration(): void {
    // this.store.dispatch(ChatActions.stopStream());
  }

  public sendMessage(): void {
    const message = this.chatForm.value.message?.trim();
    if (message) {
      this.scrollBehavior = 'start';
      this.handleNewMessage(message); // <-- This function is now fixed
      this.chatForm.reset();
      this.autoGrowDirective?.reset();
    }
  }

  public sendSuggestion(prompt: string): void {
    this.scrollBehavior = 'start';
    this.handleNewMessage(prompt);
  }

  public handleEnterPress(event: KeyboardEvent): void {
    if (!event.shiftKey && this.chatForm.valid && event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage();
    }
  }

  public onEditMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent) {
      this.chatForm.patchValue({ message: textContent });
      this.chatTextarea.nativeElement.focus();
      setTimeout(() => {
        this.chatTextarea.nativeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }, 0);
    }
  }

  public onCopyMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent) {
      this.copyToClipboard(textContent);
    }
  }

  // --- Private Helper Methods ---

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
        console.warn("Error scrolling to message:", err);
      }
    }, 310);
  }

  // --- THIS FUNCTION IS ALSO CORRECTED ---
  private handleNewMessage(message: string): void {
    // 1. Get the chat ID from the route snapshot
    let currentChatId = this.route.snapshot.paramMap.get('id');

    if (currentChatId) {
      // 2. We are on an existing chat (/chat/123).
      //    We JUST send the message. No navigation.
      console.log("Sending message to existing chat ID:", currentChatId);
      this.store.dispatch(ChatActions.sendMessage({ message, chatId: currentChatId }));
    
    } else {
      // 3. We are on a new chat (/chat).
      const newChatId = crypto.randomUUID();
      console.log("Sending message to new chat ID:", newChatId);
      
      // 4. Send the message WITH the new ID.
      //    The reducer will add this to the `messages` array in the state.
      this.store.dispatch(ChatActions.sendMessage({ message, chatId: newChatId }));
      
      // 5. NOW we navigate. `ngOnInit` will fire, but the
      //    `currentMessages.length === 0` check will be *false*,
      //    preventing `loadChatHistory` from being called.
      this.router.navigate(['/chat', newChatId]);
    }
  }

  private getTextFromMessage(message: ChatMessage): string | null {
    return message.content
      .filter(b => b.type === 'text')
      .map(b => b.value)
      .join('\n');
  }

  private copyToClipboard(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Prevent screen flicker
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '2em';
    ta.style.height = '2em';
    ta.style.padding = '0';
    ta.style.border = 'none';
    ta.style.outline = 'none';
    ta.style.boxShadow = 'none';
    ta.style.background = 'transparent';
    ta.style.opacity = '0';

    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(ta);
  }
}

