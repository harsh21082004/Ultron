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

// Selectors & Actions
import { selectAuthUser } from '../auth/auth.selectors';
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

  // 1. Load History
  loadHistory$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.enterChat),
      switchMap(action =>
        this.chatDbService.getChatHistory(action.chatId).pipe(
          map(res => ChatApiActions.loadChatHistorySuccess({ 
              chatId: action.chatId, 
              messages: res.messages, 
              currentLeafId: res.currentLeafId 
          })),
          catchError(error => of(ChatApiActions.loadChatHistoryFailure({ chatId: action.chatId, error: error.message })))
        )
      )
    );
  });

  // 2. Send Message (Stream)
  sendMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.sendMessage),
      withLatestFrom(this.store.select(selectAuthUser)),
      switchMap(([action, user]) => {
        const language = user?.preferences?.language || 'English';
        const userContext = user ? { name: user.name, preferences: user.preferences } : null;

        return this.chatApiService.sendMessageStream(
            action.message, action.chatId, action.parentMessageId, action.base64Files, language, userContext
        ).pipe(
          map(event => { 
             if (event.type === 'text') return ChatApiActions.receiveStreamChunk({ chunk: event.value });
             if (event.type === 'status') return ChatApiActions.updateStreamStatus({ status: event.value });
             if (event.type === 'log') return ChatApiActions.addStreamLog({ log: event.value });
             if (event.type === 'sources') {
                 try { return ChatApiActions.updateStreamSources({ sources: JSON.parse(event.value) }); }
                 catch { return ChatApiActions.addStreamLog({ log: 'Error parsing sources' }); }
             }
             if (event.type === 'update_pref') { 
                 try {
                    const updateData = JSON.parse(event.value);
                    const rootUpdates: any = {};
                    const prefUpdates: any = {};
                    Object.keys(updateData).forEach(key => {
                        if (key === 'name' || key === 'profilePic') rootUpdates[key] = updateData[key];
                        else prefUpdates[key] = updateData[key];
                    });
                    const payload: any = { ...rootUpdates };
                    if (Object.keys(prefUpdates).length > 0) payload.preferences = prefUpdates;
                    return AuthActions.updateUserProfile({ data: payload });
                 } catch { return ChatApiActions.addStreamLog({ log: 'Failed to update settings.' }); }
             }

             //Handle Icon update from stream
              if (event.type === 'icon') {
                  try {
                    console.log(event.value)
                      return ChatApiActions.updateAgentIcon({ icon: event.value });
                  } catch {
                      return ChatApiActions.addStreamLog({ log: 'Error parsing icon data' });
                  }
              }
             // Handle Agent Name update from stream
             if (event.type === 'agent_name') {
                 // Assuming you have an action for this, otherwise we log it or ignore
                 // Ideally: return ChatApiActions.updateActiveAgent({ agentName: event.value });
                 // For now, returning status update to visualize it
                 return ChatApiActions.updateStreamStatus({ status: `${event.value} is working...` });
             }
             if (event.type === 'skeleton'){
              console.log('Skeleton event received:', event.value)
                  try { return ChatApiActions.updateSkeleton({ skeleton: event.value }); }
                  catch { return ChatApiActions.addStreamLog({ log: 'Error parsing skeleton data' }); }
             }

             return ChatApiActions.receiveStreamChunk({ chunk: '' }); // Fallback
          }),
          takeUntil(this.actions$.pipe(ofType(ChatPageActions.stopStream))),
          // FIX: Added 'agentName' to satisfy the interface
          endWith(ChatApiActions.streamComplete({ chatId: action.chatId, agentName: 'Ultron' })),
          catchError(error => of(ChatApiActions.streamFailure({ error: error.message })))
        );
      })
    );
  });

  // 3. Signal Stream Started
  startStream$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.sendMessage),
      map(() => ChatApiActions.streamStarted())
    );
  });

  // 4. Hydrate AI Memory
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

  // 5. Save Chat & GENERATE TITLE
  saveOnStreamComplete$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatApiActions.streamComplete),
      withLatestFrom(
        // We need ALL messages to save the Tree Structure to DB
        this.store.select(ChatSelectors.selectMessages), 
        // We need VISIBLE messages to generate a relevant Title for the current topic
        this.store.select(ChatSelectors.selectVisibleThread), 
        this.store.select(ChatSelectors.selectCurrentChat),
        this.store.select(ChatSelectors.selectChatState)
      ),
      switchMap(([action, allMessages, visibleMessages, currentChat, state]) => {
        const chatId = action.chatId;
        const leafId = state.currentLeafId; // This is the REAL ID now (updated by reducer)
        
        const currentTitle = currentChat?.title || 'New Chat';
        const isDefaultTitle = currentTitle === 'New Chat';
        
        // Only generate title if it's "New Chat" and we have at least a User+AI pair in visible thread
        const shouldGenerateTitle = isDefaultTitle && visibleMessages.length >= 2;

        if (shouldGenerateTitle) {
            // Generate Title based on what the user is currently seeing
            return this.chatApiService.generateTitle(visibleMessages).pipe(
                switchMap(res => {
                    const newTitle = res.title || 'New Chat';
                    return this.chatDbService.saveChat(chatId, allMessages, newTitle, leafId).pipe(
                        map(() => ChatApiActions.saveChatHistorySuccess({ chatId, newTitle })),
                        catchError(err => of(ChatApiActions.saveChatHistoryFailure({ error: err.message })))
                    );
                }),
                // If Title Gen fails, save with default title
                catchError(() => {
                    return this.chatDbService.saveChat(chatId, allMessages, currentTitle, leafId).pipe(
                        map(() => ChatApiActions.saveChatHistorySuccess({ chatId, newTitle: currentTitle })),
                        catchError(err => of(ChatApiActions.saveChatHistoryFailure({ error: err.message })))
                    );
                })
            );
        } else {
            // Just Save (Title exists or not enough messages)
            return this.chatDbService.saveChat(chatId, allMessages, currentTitle, leafId).pipe(
                map(() => ChatApiActions.saveChatHistorySuccess({ chatId, newTitle: currentTitle })),
                catchError(err => of(ChatApiActions.saveChatHistoryFailure({ error: err.message })))
            );
        }
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
      ));
  });

  // 7. Refresh List after Save
  refetchChatsAfterSave$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatApiActions.saveChatHistorySuccess, ChatApiActions.saveSharedConversationSuccess),
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

  // 10. Tools
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

  // 11. Sharing
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

  loadSharedChat$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.loadSharedChat),
      switchMap(action =>
        this.chatDbService.getSharedPreview(action.shareId).pipe(
          map(res => ChatApiActions.loadSharedChatSuccess({ 
              title: res.title, messages: res.messages, createdAt: res.createdAt, shareId: res.shareId,
              currentLeafId: res.currentLeafId // Important for viewing correct branch
          })),
          catchError(err => of(ChatApiActions.loadSharedChatFailure({ error: err.message ?? 'Importing shared chat failed' })))
        )
      )
    )
  })

  saveSharedConversation$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ChatPageActions.saveSharedConversation),
      switchMap(action => {
        if (!action.shareId) return of(ChatApiActions.saveSharedConversationFailure({ error: 'Share ID is required' }));
        
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