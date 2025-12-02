import { createAction, props } from '@ngrx/store';
import { ChatMessage } from './chat.state';

// --- ACTIONS FOR LOADING HISTORY ---
export const loadChatHistory = createAction(
  '[Chat API] Load Chat History',
  props<{ chatId: string }>()
);

// --- MODIFIED: Added chatId ---
export const loadChatHistorySuccess = createAction(
  '[Chat API] Load Chat History Success',
  props<{ chatId: string, messages: ChatMessage[] }>()
);

// --- MODIFIED: Added chatId ---
export const loadChatHistoryFailure = createAction(
  '[Chat API] Load Chat History Failure',
  props<{ chatId: string, error: string }>()
);

// --- NEW: Actions for AI Memory Hydration ---
export const hydrateHistorySuccess = createAction(
  '[Chat API] Hydrate AI Memory Success'
);
export const hydrateHistoryFailure = createAction(
  '[Chat API] Hydrate AI Memory Failure',
  props<{ error: string }>()
);

// --- ACTIONS FOR SAVING HISTORY ---
export const saveChatHistory = createAction(
  '[Chat API] Save Chat History',
  props<{ chatId: string; messages: ChatMessage[] }>()
);
export const saveChatHistorySuccess = createAction(
  '[Chat] Save Chat History Success',
  props<{ chatId: string, newTitle: string }>() // Add props
);
export const saveChatHistoryFailure = createAction(
  '[Chat API] Save Chat History Failure',
  props<{ error: string }>()
);


// --- ACTIONS FOR REAL-TIME CHAT ---
export const sendMessage = createAction(
  '[Chat] Send Message',
  props<{ message: string; chatId: string }>()
);

export const streamStarted = createAction(
  '[Chat] Stream Started'
);

export const receiveStreamChunk = createAction(
  '[Chat] Receive Stream Chunk',
  props<{ chunk: string }>()
);

// CORRECTED: This action now carries the chatId in its payload.
export const streamComplete = createAction(
  '[Chat] Stream Complete',
  props<{ chatId: string }>()
);

export const streamFailure = createAction(
  '[Chat] Stream Failure',
  props<{ error: string }>()
);


export const getAllChats = createAction(
  '[Chat] Get All Chats',
  props<{ userId: string }>()
);

export const getAllChatsSuccess = createAction(
  '[Chat] Get All Chats Success',
  props<{ chats: any[] }>()
);

export const getAllChatsFailure = createAction(
  '[Chat] Get All Chats Failure',
  props<{ error: string }>()
);

// Clear Active Chat After Navigating to New Chat

export const clearActiveChat = createAction(
  '[Chat] Clear Active Chat'
);

export const deleteAllChats = createAction(
  '[Chat] Delete All Chats',
)

export const deleteAllChatsSuccess = createAction(
  `[Chat] Delete All Chats Success`,
  props<{chats: any[]}>()
)

export const deleteAllChatsFailure = createAction(
  `[Chat] Delete All Chats Failure`,
  props<{error: string}>()
)