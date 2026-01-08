import {
  Component, ElementRef, ViewChild, ChangeDetectionStrategy, inject, OnInit, OnDestroy, AfterViewInit,
  ViewChildren, QueryList, HostListener, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, lastValueFrom, withLatestFrom, take } from 'rxjs';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';

// Store & Services
import { AppState } from '../../../store';
import { ChatSelectors } from '../../../store/chat/chat.selectors';
import { ChatPageActions, ChatApiActions } from '../../../store/chat/chat.actions';
import { ChatMessage, StreamStatus } from '../../../store/chat/chat.state';
import { selectAuthUser } from '../../../store/auth/auth.selectors';
import { User } from '../../models/user.model';
import { ClipboardService } from '../../../core/services/clipboard.service';
import { AudioApiService } from '../../../core/services/audio-api.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { ThemeService } from '../../../core/services/theme.services';

// Components & Directives
import { ChatInputComponent, ChatMessageEvent } from '../../components/chat-input/chat-input';
import { ChatEmptyStateComponent } from '../../components/chat-empty-state/chat-empty-state';
import { ContentRendererComponent } from '../content-renderer/content-renderer.component';
import { HeaderComponent } from '../header/header.component';
import { UltronLoaderComponent } from '../ultron-loader/ultron-loader.component';
import { AutoGrowDirective } from '../../directives/auto-grow.directive';
import { ImageViewerComponent } from "../image-viewer/image-viewer";

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
    FormsModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatInputModule,
    HeaderComponent, ContentRendererComponent, UltronLoaderComponent,
    ChatInputComponent, ChatEmptyStateComponent,
    AutoGrowDirective,
    ImageViewerComponent
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
  public previewImageUrl: string | null = null;

  private isInitialLoad = true;

  // --- INLINE EDITING STATE ---
  public editingMessageId: string | null = null;
  public editContent: string = '';

  private store = inject(Store<AppState>);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clipboard = inject(ClipboardService);
  private audioService = inject(AudioApiService);
  private fileUploadService = inject(FileUploadService);
  public themeService = inject(ThemeService);

  private routeSub!: Subscription;
  private messagesSub!: Subscription;

  constructor() {
    this.messages$ = this.store.select(ChatSelectors.selectVisibleThread);
    this.isLoading$ = this.store.select(ChatSelectors.selectIsLoading);
    this.isStreaming$ = this.store.select(ChatSelectors.selectIsStreaming);
    this.streamStatus$ = this.store.select(ChatSelectors.selectStreamStatus);
    this.user$ = this.store.select(selectAuthUser);
    this.updateIsMobileView();

    this.messages$.subscribe(msgs => { console.log("Visible Messages Updated:", msgs); });
  }

  @HostListener('window:resize') onResize() { this.updateIsMobileView(); }
  private updateIsMobileView() { this.isMobileView = window.innerWidth <= 840; }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.pipe(
      withLatestFrom(this.store.select(ChatSelectors.selectCurrentChatId), this.store.select(ChatSelectors.selectShareId))
    ).subscribe(([params, currentLoadedChatId, currentShareId]) => {
      const urlChatId = params.get('id');
      const routeShareId = params.get('shareId');
      this.isInitialLoad = true;
      this.cancelEdit();

      console.log("Route params changed:", { urlChatId, routeShareId, currentLoadedChatId, currentShareId })

      if (routeShareId) {
        this.isSharedChatView = true;
        this.store.dispatch(ChatPageActions.clearActiveChat());
        if (routeShareId !== currentShareId) this.store.dispatch(ChatPageActions.loadSharedChat({ shareId: routeShareId }));
      } else if (urlChatId) {
        this.isSharedChatView = false;
        if (currentShareId) this.store.dispatch(ChatPageActions.clearShareState());
        if (urlChatId !== currentLoadedChatId || !!currentShareId) this.store.dispatch(ChatPageActions.enterChat({ chatId: urlChatId }));
      } else {
        this.isSharedChatView = false;
        if (currentShareId) this.store.dispatch(ChatPageActions.clearShareState());
        this.store.dispatch(ChatPageActions.clearActiveChat());
      }

      console.log(this.isSharedChatView)
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

  ngOnDestroy(): void { this.routeSub?.unsubscribe(); this.messagesSub?.unsubscribe(); }

  public trackByMessage(_index: number, message: ChatMessage): string { return message._id; }

  public hasTextBlock(message: ChatMessage): boolean {
    return message.content.some(block => block.type === 'text' && block.value.trim().length > 0);
  }
  public hasImages(message: ChatMessage): boolean {
    return message.content.some(block => block.type === 'image_url');
  }

  public openImagePreview(url: string): void {
    this.previewImageUrl = url;
  }

  public closeImagePreview(): void {
    this.previewImageUrl = null;
  }

  // --- EDIT ACTIONS ---

  public onEditMessage(message: ChatMessage): void {
    this.editingMessageId = message._id;
    this.editContent = this.getTextFromMessage(message) || '';
  }

  public cancelEdit(): void {
    this.editingMessageId = null;
    this.editContent = '';
  }

  public saveEdit(originalMessage: ChatMessage): void {
    if (!this.editContent.trim()) return;

    // Attach to the SAME parent as the original message to create a Sibling/Branch
    this.processNewMessage(
      this.editContent,
      originalMessage.parentMessageId,
      []
    );

    this.cancelEdit();
  }

  // --- SENDING LOGIC ---

  public async handleSendMessage(event: ChatMessageEvent): Promise<void> {
    let messageText = event.message;
    const files = event.files;
    let attachments: any[] = [];
    let base64Files: string[] = [];

    if (files.length > 0) {
      const base64Promises = files.map(file => this.fileToBase64(file));
      const uploadPromise = lastValueFrom(this.fileUploadService.upload(files, 'chat-media'));
      try {
        const [base64Results, uploadResult] = await Promise.all([Promise.all(base64Promises), uploadPromise]);
        base64Files = base64Results;
        if (uploadResult && uploadResult.files) {
          attachments = uploadResult.files.map(f => ({
            type: f.mimeType.startsWith('image') ? 'image_url' : 'file',
            url: f.url, name: f.originalName
          }));
        }
      } catch (error) { console.error("Error processing files:", error); return; }
    }

    // Normal send: parentId is undefined (auto-detected as leaf)
    this.processNewMessage(messageText, undefined, attachments, base64Files);
    setTimeout(() => this.scrollToLatestUserMessage(), 150);
  }

  private processNewMessage(
    message: string,
    forcedParentId?: string | null,
    attachments: any[] = [],
    base64Files: string[] = []
  ): void {
    let currentChatId = this.route.snapshot.paramMap.get('id');
    const newId = crypto.randomUUID();

    this.store.select(ChatSelectors.selectChatState).pipe(take(1)).subscribe(state => {
      let parentId = forcedParentId;

      // If not forced (Normal Send from bottom bar), use current leaf
      if (parentId === undefined) {
        parentId = state.currentLeafId;
        // Fallback for empty state or legacy data
        if (!parentId && state.messages.length > 0) {
          parentId = state.messages[state.messages.length - 1]._id;
        }
      }

      const payload = {
        message: message.trim(),
        chatId: currentChatId || newId,
        parentMessageId: parentId,
        attachments,
        base64Files
      };
      this.store.dispatch(ChatPageActions.sendMessage(payload));
      if (!currentChatId) this.router.navigate(['/chat', newId]);
    });
  }

  // --- MISSING METHODS RESTORED BELOW ---

  public handleStopGeneration(): void {
    this.store.dispatch(ChatPageActions.stopStream());
  }

  public handleSuggestionClick(prompt: string): void {
    this.processNewMessage(prompt);
    setTimeout(() => this.scrollToLatestUserMessage(), 150);
  }

  public onCopyMessage(message: ChatMessage): void {
    const textContent = this.getTextFromMessage(message);
    if (textContent) this.clipboard.copyText(textContent);
  }

  // --- NAVIGATION & TREE LOGIC ---

  public getSiblingInfo(message: ChatMessage): Observable<any> {
    return this.store.select(ChatSelectors.selectMessageSiblings(message._id));
  }

  public switchVersion(message: ChatMessage, direction: number): void {
    this.store.select(ChatSelectors.selectMessages).pipe(take(1)).subscribe(allMsgs => {
      let siblings: string[] = [];

      if (!message.parentMessageId) {
        // Root message case
        siblings = allMsgs.filter(m => m.parentMessageId === null && m.sender === message.sender).map(m => m._id);
      } else {
        // Standard message case
        const parent = allMsgs.find(m => m._id === message.parentMessageId);
        if (parent) siblings = parent.childrenIds;
      }

      if (siblings.length > 1) {
        const currentIndex = siblings.indexOf(message._id);
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < siblings.length) {
          const siblingId = siblings[newIndex];
          const newLeaf = this.findLeaf(allMsgs, siblingId);
          this.store.dispatch(ChatPageActions.setCurrentLeaf({ leafId: newLeaf }));
        }
      }
    });
  }

  private findLeaf(messages: ChatMessage[], startId: string): string {
    let currentId = startId;
    let safety = 0;
    while (safety < 10000) {
      const node = messages.find(m => m._id === currentId);
      if (node && node.childrenIds.length > 0) {
        currentId = node.childrenIds[node.childrenIds.length - 1];
      } else { return currentId; }
      safety++;
    }
    return currentId;
  }

  // --- HELPERS ---

  private getTextFromMessage(message: ChatMessage): string | null {
    return message.content.filter(b => b.type !== 'image_url' && b.type !== 'image').map(b => b.value).join('\n');
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTo({ top: this.chatContainer.nativeElement.scrollHeight, behavior: 'instant' });
      }
    }, 100);
  }

  private scrollToLatestUserMessage() {
    try {
      const elements = this.messageElements.toArray();
      if (elements.length > 0) {
        const userMsgIndex = elements.length >= 2 ? elements.length - 2 : elements.length - 1;
        elements[userMsgIndex]?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) { console.warn("Scroll failed:", err); }
  }

  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
}