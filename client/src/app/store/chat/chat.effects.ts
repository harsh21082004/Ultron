import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom, endWith, filter, debounceTime, takeUntil, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import * as ChatActions from './chat.actions';
import { AppState } from '..';
import { selectChatMessages, selectCurrentChat } from './chat.selectors';
import { selectAuthUser } from '../auth/auth.selectors';
import { ChatDbService } from '../../core/services/chat-db.service';
import { AudioApiService } from '../../core/services/audio-api.service';
import { VisionApiService } from '../../core/services/vision-api.service';
import { TranslateApiService } from '../../core/services/translate-api.service';
import { ChatApiService } from '../../core/services/chat-api.services';
import { Router } from '@angular/router';

@Injectable()
export class ChatEffects {
  private actions$ = inject(Actions);
  private store = inject(Store<AppState>);
  private chatApiService = inject(ChatApiService);
  private chatDbService = inject(ChatDbService);
  private audioApi = inject(AudioApiService);
  private visionApi = inject(VisionApiService);
  private translateApi = inject(TranslateApiService);
  private router = inject(Router);

  loadHistory$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.loadChatHistory),
      switchMap(action =>
        this.chatDbService.getChatHistory(action.chatId).pipe(
          map(messages => ChatActions.loadChatHistorySuccess({ chatId: action.chatId, messages })),
          catchError(error => of(ChatActions.loadChatHistoryFailure({ chatId: action.chatId, error: error.message })))
        )
      )
    );
  });

  // --- UPDATED: Handles Status, Logs (Thoughts), Sources, and Text events ---
  sendMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.sendMessage),
      switchMap(action =>
        this.chatApiService.sendMessageStream(action.message, action.chatId, action.image).pipe(
          map(event => {
            // 1. STATUS UPDATE (e.g. "Thinking...")
            if (event.type === 'status') {
              return ChatActions.updateStreamStatus({ status: event.value });
            } 
            // 2. LOG / REASONING (e.g. "Identifying Intent...")
            else if (event.type === 'log') {
              return ChatActions.addStreamLog({ log: event.value });
            } 
            // 3. SOURCES (JSON string of sources) -> NEW
            else if (event.type === 'sources') {
              console.log(event)
              try {
                // The value is expected to be a JSON string like '[{"title": "...", "uri": "..."}]'
                const sources = JSON.parse(event.value);
                return ChatActions.updateStreamSources({ sources });
              } catch (e) {
                console.warn('Failed to parse sources JSON:', event.value);
                // Fallback to logging it if parsing fails
                return ChatActions.addStreamLog({ log: 'Received sources but failed to parse.' });
              }
            }
            // 4. TEXT CHUNK (The actual answer) 
            else {
              return ChatActions.receiveStreamChunk({ chunk: event.value });
            }
          }),
          tap((event)=> {
            console.log(event)
          }),
          takeUntil(this.actions$.pipe(ofType(ChatActions.stopStream))),
          endWith(ChatActions.streamComplete({ chatId: action.chatId })),
          catchError(error => of(ChatActions.streamFailure({ error: error.message })))
        )
      )
    );
  });

  startStream$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.sendMessage),
      map(() => ChatActions.streamStarted())
    )
  });

  hydrateAiMemory$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.loadChatHistorySuccess),
      filter(action => !!action.chatId && action.messages.length > 0),
      switchMap(action =>
        this.chatApiService.hydrateHistory(action.chatId, action.messages).pipe(
          map(() => ChatActions.hydrateHistorySuccess()),
          catchError(error => of(ChatActions.hydrateHistoryFailure({ error: error.message })))
        )
      )
    );
  });

  saveOnStreamComplete$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.streamComplete),
      withLatestFrom(
        this.store.select(selectChatMessages),
        this.store.select(selectCurrentChat)
      ),
      switchMap(([action, messages, currentChat]) => {
        const chatId = action.chatId;

        if (!chatId || messages.length < 2) {
          return of(ChatActions.saveChatHistoryFailure({ error: 'Missing data to save chat.' }));
        }

        // --- NEW LOGIC: Prevent Title Regeneration ---
        // Only generate title if:
        // 1. It is the very first exchange (2 messages: 1 User, 1 AI)
        // 2. AND the current title is "New Chat" (or missing)
        const isFirstExchange = messages.length === 2;
        const hasCustomTitle = currentChat?.title && currentChat.title !== 'New Chat';
        
        // If it's a long conversation or already has a custom title, SKIP generation.
        if (!isFirstExchange || hasCustomTitle) {
           const existingTitle = currentChat?.title || 'New Chat';
           return this.chatDbService.saveChat(chatId, messages, existingTitle).pipe(
              map(() => ChatActions.saveChatHistorySuccess({ chatId, newTitle: existingTitle })),
              catchError(error => of(ChatActions.saveChatHistoryFailure({ error: error.message })))
           );
        }

        // Otherwise, generate the title (First run)
        return this.chatApiService.generateTitle(messages).pipe(
          switchMap(titleResponse => {
            const aiTitle = titleResponse.title || 'New Chat';
            return this.chatDbService.saveChat(chatId, messages, aiTitle).pipe(
              map(() => ChatActions.saveChatHistorySuccess({ chatId, newTitle: aiTitle })),
              catchError(error => of(ChatActions.saveChatHistoryFailure({ error: error.message })))
            );
          }),
          catchError(titleError => {
            console.error("Failed to generate AI title, saving with default.", titleError);
            const firstUserMessage = messages.find(m => m.sender === 'user');
            const firstTextContent = firstUserMessage?.content.find(c => c.type === 'text');
            const defaultTitle = (firstTextContent?.value as string)?.substring(0, 50) || 'New Chat';

            return this.chatDbService.saveChat(chatId, messages, defaultTitle).pipe(
              map(() => ChatActions.saveChatHistorySuccess({ chatId, newTitle: defaultTitle })),
              catchError(dbError => of(ChatActions.saveChatHistoryFailure({ error: dbError.message })))
            );
          })
        );
      })
    );
  });

  getAllChats$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.getAllChats),
      switchMap(action =>
        this.chatDbService.getAllChats(action.userId).pipe(
          map(chats => ChatActions.getAllChatsSuccess({ chats })),
          catchError(error => of(ChatActions.getAllChatsFailure({ error: error.message })))
        )
      ))
  });

  refetchChatsAfterSave$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.saveChatHistorySuccess),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      map(([action, user]) => ChatActions.getAllChats({ userId: user!._id }))
    );
  });

  deleteAllChats$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.deleteAllChats),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      switchMap(([action, user]) => {
        return this.chatDbService.deleteAllChats(user!._id).pipe(
          map(() => ChatActions.getAllChatsSuccess({ chats: [] })),
          catchError(error => of(ChatActions.getAllChatsFailure({ error: error.message })))
        )
      })
    )
  });

  searchChats$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.searchChats),
      debounceTime(300),
      switchMap(action => 
        this.chatDbService.searchChats(action.query).pipe(
          map(results => ChatActions.searchChatsSuccess({ results })),
          catchError(error => of(ChatActions.searchChatsFailure({ error: error.message })))
        )
      )
    );
  });

  transcribeAudio$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.transcribeAudio),
      switchMap(action =>
        this.audioApi.transcribe(action.file).pipe(
          map(res => ChatActions.transcribeAudioSuccess({ text: res.text })),
          catchError(err => of(ChatActions.transcribeAudioFailure({ error: err.message ?? 'Transcription failed' })))
        )
      )
    );
  });

  analyzeImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.analyzeImage),
      switchMap(action =>
        this.visionApi.analyzeImage(action.imageUrl, action.prompt).pipe(
          map(res => ChatActions.analyzeImageSuccess({ imageUrl: action.imageUrl, result: res.result })),
          catchError(err => of(ChatActions.analyzeImageFailure({ error: err.message ?? 'Vision analysis failed' })))
        )
      )
    );
  });

  translateText$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.translateText),
      switchMap(action =>
        this.translateApi.translate(action.text, action.targetLanguage).pipe(
          map(res => ChatActions.translateTextSuccess({ translated: res.translated_text })),
          catchError(err => of(ChatActions.translateTextFailure({ error: err.message ?? 'Translation failed' })))
        )
      )
    );
  });

  shareChat$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.shareChat),
      switchMap(action => 
        this.chatDbService.createShareLink(action.chatId).pipe(
          tap(res => console.log("Share link created:", res)),
          map(res => ChatActions.shareChatSuccess({ shareId: res.shareId, shareUrl: res.shareUrl })),
          catchError(err => of(ChatActions.shareChatFailure({ error: err.message ?? 'Share link creation failed' })))
        )
      )
    )
  })

  loadSharedChat$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.loadSharedChat),
      switchMap(action => 
        this.chatDbService.getSharedPreview(action.shareId).pipe(
          tap(res => console.log("Shared chat preview loaded:", res)),
          map(res => ChatActions.loadSharedChatSuccess({ title: res.title, messages: res.messages, createdAt: res.createdAt, shareId: res.shareId })),
          catchError(err => of(ChatActions.loadSharedChatFailure({ error: err.message ?? 'Importing shared chat failed' })))
        )
      )
    )
  })

  saveSharedConversation$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatActions.saveSharedConversation), 
      switchMap(action => {
        if (!action.shareId) {
          return of(ChatActions.saveSharedConversationFailure({ error: 'Share ID is required' }));
        }
        return this.chatDbService.importSharedChat(action.shareId).pipe(
          tap(res => {
             console.log("Shared chat imported, new chat ID:", res.chatId);
             this.router.navigate(['/chat', res.chatId]);
          }),
          map(res => ChatActions.saveSharedConversationSuccess({ chatId: res.chatId })),
          catchError(err => of(ChatActions.saveSharedConversationFailure({ error: err.message ?? 'Importing shared chat failed' })))
        );
      })
    )
  })
}