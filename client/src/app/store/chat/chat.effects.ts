import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  withLatestFrom,
  endWith,
  filter,
  debounceTime,
  takeUntil,
  tap
} from 'rxjs/operators';

// App State & Core Services
import { AppState } from '..';
import { ChatDbService } from '../../core/services/chat-db.service';
import { ChatApiService } from '../../core/services/chat-api.services';
import { AudioApiService } from '../../core/services/audio-api.service';
import { VisionApiService } from '../../core/services/vision-api.service';
import { TranslateApiService } from '../../core/services/translate-api.service';

// UPDATED: Auth Selectors
import { selectAuthUser } from '../auth/auth.selectors';

// UPDATED: Chat Grouped Actions & Selectors
import { ChatPageActions, ChatApiActions } from './chat.actions';
import { ChatSelectors } from './chat.selectors';
import { AuthActions } from '../auth/auth.actions';

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

  // 1. Load History (Triggered by entering page)
  loadHistory$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.enterChat),
      switchMap(action =>
        this.chatDbService.getChatHistory(action.chatId).pipe(
          map(messages => ChatApiActions.loadChatHistorySuccess({ chatId: action.chatId, messages })),
          catchError(error => of(ChatApiActions.loadChatHistoryFailure({ chatId: action.chatId, error: error.message })))
        )
      )
    );
  });

  // 2. Send Message & Handle Stream (WITH LANGUAGE SUPPORT)
  sendMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.sendMessage),
      withLatestFrom(this.store.select(selectAuthUser)), // GRAB USER
      switchMap(([action, user]) => {

        // Extract language or default to English
        // NOTE: Ensure your User interface has 'preferences.language' or adjust path
        const language = user?.preferences?.language || 'English';

        // PREPARE CONTEXT
        // We strip the token to send only relevant info to Python
        const userContext = user ? {
            name: user.name,
            email: user.email,
            preferences: user.preferences
        } : null;

        return this.chatApiService.sendMessageStream(action.message, action.chatId, action.base64Files, language, userContext).pipe(
          map(event => {
            if (event.type === 'update_pref') {
              try {
                // Parse: { "language": "Hindi" } or { "theme": "dark" }
                const updateData = JSON.parse(event.value);

                // 1. Separate Root Props (name) from Preferences (language, theme)
                const rootUpdates: any = {};
                const prefUpdates: any = {};

                Object.keys(updateData).forEach(key => {
                  if (key === 'name' || key === 'profilePic') {
                    rootUpdates[key] = updateData[key];
                  } else {
                    // Assume everything else is a preference
                    prefUpdates[key] = updateData[key];
                  }
                });

                // 2. Dispatch Update Action
                // Note: We merge with existing user prefs handled by the backend/reducer logic usually,
                // but AuthActions.updateUserProfile expects a partial User object.
                const payload: any = { ...rootUpdates };
                if (Object.keys(prefUpdates).length > 0) {
                  payload.preferences = prefUpdates;
                  // Note: Your component uses logic to merge preferences. 
                  // If your backend 'updateProfile' replaces the whole pref object, 
                  // you might need to pass { preferences: { ...user.preferences, ...prefUpdates } }
                  // But usually partial updates are better handled on backend.
                  // For now, let's assume backend/reducer merges generic keys.
                }

                return AuthActions.updateUserProfile({ data: payload });

              } catch (e) {
                console.error("Failed to parse update preference payload", e);
                return ChatApiActions.addStreamLog({ log: 'Failed to update settings.' });
              }
            }
            // A. STATUS UPDATE (e.g. "Thinking...")
            if (event.type === 'status') {
              return ChatApiActions.updateStreamStatus({ status: event.value });
            }
            // B. LOG / REASONING (e.g. "Identifying Intent...")
            else if (event.type === 'log') {
              return ChatApiActions.addStreamLog({ log: event.value });
            }
            // C. SOURCES (JSON string)
            else if (event.type === 'sources') {
              try {
                const sources = JSON.parse(event.value);
                return ChatApiActions.updateStreamSources({ sources });
              } catch (e) {
                console.warn('Failed to parse sources JSON:', event.value);
                return ChatApiActions.addStreamLog({ log: 'Received sources but failed to parse.' });
              }
            }
            // D. TEXT CHUNK (The answer)
            else {
              return ChatApiActions.receiveStreamChunk({ chunk: event.value });
            }
          }),
          takeUntil(this.actions$.pipe(ofType(ChatPageActions.stopStream))),
          endWith(ChatApiActions.streamComplete({ chatId: action.chatId })),
          catchError(error => of(ChatApiActions.streamFailure({ error: error.message })))
        );
      })
    );
  });

  // 3. Signal that Stream Started (UI Spinner logic)
  startStream$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.sendMessage),
      map(() => ChatApiActions.streamStarted())
    );
  });

  // 4. Hydrate AI Memory (Context) after history load
  hydrateAiMemory$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatApiActions.loadChatHistorySuccess),
      filter(action => !!action.chatId && action.messages.length > 0),
      switchMap(action =>
        this.chatApiService.hydrateHistory(action.chatId, action.messages).pipe(
          map(() => ChatApiActions.hydrateHistorySuccess()),
          catchError(error => of(ChatApiActions.hydrateHistoryFailure({ error: error.message })))
        )
      )
    );
  });

  // 5. Save Chat & Generate Title on Completion
  saveOnStreamComplete$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatApiActions.streamComplete),
      withLatestFrom(
        this.store.select(ChatSelectors.selectMessages),
        this.store.select(ChatSelectors.selectCurrentChat)
      ),
      switchMap(([action, messages, currentChat]) => {
        const chatId = action.chatId;

        if (!chatId || messages.length < 2) {
          return of(ChatApiActions.saveChatHistoryFailure({ error: 'Missing data to save chat.' }));
        }

        // Logic: Only generate title on first exchange if title is default
        const isFirstExchange = messages.length === 2;
        const hasCustomTitle = currentChat?.title && currentChat.title !== 'New Chat';

        // If existing conversation, just save
        if (!isFirstExchange || hasCustomTitle) {
          const existingTitle = currentChat?.title || 'New Chat';
          return this.chatDbService.saveChat(chatId, messages, existingTitle).pipe(
            map(() => ChatApiActions.saveChatHistorySuccess({ chatId, newTitle: existingTitle })),
            catchError(error => of(ChatApiActions.saveChatHistoryFailure({ error: error.message })))
          );
        }

        // Generate Title (First Run)
        return this.chatApiService.generateTitle(messages).pipe(
          switchMap(titleResponse => {
            const aiTitle = titleResponse.title || 'New Chat';
            return this.chatDbService.saveChat(chatId, messages, aiTitle).pipe(
              map(() => ChatApiActions.saveChatHistorySuccess({ chatId, newTitle: aiTitle })),
              catchError(error => of(ChatApiActions.saveChatHistoryFailure({ error: error.message })))
            );
          }),
          // Fallback if Title Gen fails: Save with default
          catchError(titleError => {
            console.error("Failed to generate AI title, saving with default.", titleError);
            const firstUserMessage = messages.find(m => m.sender === 'user');
            const firstTextContent = firstUserMessage?.content.find(c => c.type === 'text');
            const defaultTitle = (firstTextContent?.value as string)?.substring(0, 50) || 'New Chat';

            return this.chatDbService.saveChat(chatId, messages, defaultTitle).pipe(
              map(() => ChatApiActions.saveChatHistorySuccess({ chatId, newTitle: defaultTitle })),
              catchError(dbError => of(ChatApiActions.saveChatHistoryFailure({ error: dbError.message })))
            );
          })
        );
      })
    );
  });

  // 6. Sidebar Chat List
  getAllChats$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.getAllChats),
      switchMap(action =>
        this.chatDbService.getAllChats(action.userId).pipe(
          map(chats => ChatApiActions.getAllChatsSuccess({ chats })),
          catchError(error => of(ChatApiActions.getAllChatsFailure({ error: error.message })))
        )
      ))
  });

  // 7. Refresh List after a Save (Title update or new chat)
  refetchChatsAfterSave$ = createEffect(() => {
    return this.actions$.pipe(
      // UPDATED: Listen to BOTH 'Save History' AND 'Save Shared Conversation'
      ofType(
        ChatApiActions.saveChatHistorySuccess,
        ChatApiActions.saveSharedConversationSuccess
      ),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      map(([action, user]) => ChatPageActions.getAllChats({ userId: user!._id }))
    );
  });

  // 8. Delete All
  deleteAllChats$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.deleteAllChats),
      withLatestFrom(this.store.select(selectAuthUser)),
      filter(([action, user]) => !!user),
      switchMap(([action, user]) => {
        return this.chatDbService.deleteAllChats(user!._id).pipe(
          map(() => ChatApiActions.getAllChatsSuccess({ chats: [] })),
          catchError(error => of(ChatApiActions.getAllChatsFailure({ error: error.message })))
        )
      })
    )
  });

  // 9. Search
  searchChats$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.searchChats),
      debounceTime(300),
      switchMap(action =>
        this.chatDbService.searchChats(action.query).pipe(
          map(results => ChatApiActions.searchChatsSuccess({ results })),
          catchError(error => of(ChatApiActions.searchChatsFailure({ error: error.message })))
        )
      )
    );
  });

  // 10. Tools: Audio Transcription
  transcribeAudio$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.transcribeAudio),
      switchMap(action =>
        this.audioApi.transcribe(action.file).pipe(
          map(res => ChatApiActions.transcribeAudioSuccess({ text: res.text })),
          catchError(err => of(ChatApiActions.transcribeAudioFailure({ error: err.message ?? 'Transcription failed' })))
        )
      )
    );
  });

  // 11. Tools: Image Analysis
  analyzeImage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.analyzeImage),
      switchMap(action =>
        this.visionApi.analyzeImage(action.imageUrl, action.prompt).pipe(
          map(res => ChatApiActions.analyzeImageSuccess({ imageUrl: action.imageUrl, result: res.result })),
          catchError(err => of(ChatApiActions.analyzeImageFailure({ error: err.message ?? 'Vision analysis failed' })))
        )
      )
    );
  });

  // 12. Tools: Translation
  translateText$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.translateText),
      switchMap(action =>
        this.translateApi.translate(action.text, action.targetLanguage).pipe(
          map(res => ChatApiActions.translateTextSuccess({ translated: res.translated_text })),
          catchError(err => of(ChatApiActions.translateTextFailure({ error: err.message ?? 'Translation failed' })))
        )
      )
    );
  });

  // 13. Sharing: Create Link
  shareChat$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.shareChat),
      switchMap(action =>
        this.chatDbService.createShareLink(action.chatId).pipe(
          map(res => ChatApiActions.shareChatSuccess({ shareId: res.shareId, shareUrl: res.shareUrl })),
          catchError(err => of(ChatApiActions.shareChatFailure({ error: err.message ?? 'Share link creation failed' })))
        )
      )
    )
  })

  // 14. Sharing: Load Shared Chat (Preview)
  loadSharedChat$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.loadSharedChat),
      switchMap(action =>
        this.chatDbService.getSharedPreview(action.shareId).pipe(
          map(res => ChatApiActions.loadSharedChatSuccess({ title: res.title, messages: res.messages, createdAt: res.createdAt, shareId: res.shareId })),
          catchError(err => of(ChatApiActions.loadSharedChatFailure({ error: err.message ?? 'Importing shared chat failed' })))
        )
      )
    )
  })

  // 15. Sharing: Import/Save to Account
  saveSharedConversation$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.saveSharedConversation),
      switchMap(action => {
        if (!action.shareId) {
          return of(ChatApiActions.saveSharedConversationFailure({ error: 'Share ID is required' }));
        }
        return this.chatDbService.importSharedChat(action.shareId).pipe(
          tap(res => {
            this.router.navigate(['/chat', res.chatId]);
          }),
          map(res => ChatApiActions.saveSharedConversationSuccess({ chatId: res.chatId })),
          catchError(err => of(ChatApiActions.saveSharedConversationFailure({ error: err.message ?? 'Importing shared chat failed' })))
        );
      })
    )
  })
}