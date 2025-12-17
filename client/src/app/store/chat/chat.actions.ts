import { createAction, props } from '@ngrx/store';
import { ChatMessage, Source } from './chat.state';

// --- ACTIONS FOR LOADING HISTORY ---
export const loadChatHistory = createAction(
  '[Chat API] Load Chat History',
  props<{ chatId: string }>()
);

export const loadChatHistorySuccess = createAction(
  '[Chat API] Load Chat History Success',
  props<{ chatId: string, messages: ChatMessage[] }>()
);

export const loadChatHistoryFailure = createAction(
  '[Chat API] Load Chat History Failure',
  props<{ chatId: string, error: string }>()
);

// --- ACTIONS FOR SAVING HISTORY ---
export const saveChatHistory = createAction(
  '[Chat API] Save Chat History',
  props<{ chatId: string; messages: ChatMessage[] }>()
);

export const saveChatHistorySuccess = createAction(
  '[Chat] Save Chat History Success',
  props<{ chatId: string, newTitle: string }>()
);

export const saveChatHistoryFailure = createAction(
  '[Chat API] Save Chat History Failure',
  props<{ error: string }>()
);

// --- ACTIONS FOR AI MEMORY ---
export const hydrateHistorySuccess = createAction(
  '[Chat API] Hydrate AI Memory Success'
);

export const hydrateHistoryFailure = createAction(
  '[Chat API] Hydrate AI Memory Failure',
  props<{ error: string }>()
);

// --- ACTIONS FOR REAL-TIME CHAT ---
export const sendMessage = createAction(
  '[Chat] Send Message',
  props<{ message: string; chatId: string; image?: string }>() 
);

export const streamStarted = createAction(
  '[Chat] Stream Started'
);

export const stopStream = createAction(
  '[Chat] Stop Stream'
);

export const receiveStreamChunk = createAction(
  '[Chat] Receive Stream Chunk',
  props<{ chunk: string }>()
);

// NEW: Update the main status text (e.g. "Analyzing Image...")
export const updateStreamStatus = createAction(
  '[Chat] Update Stream Status',
  props<{ status: string }>()
);

// NEW: Add a reasoning step log (e.g. "Identifying Intent...")
export const addStreamLog = createAction(
  '[Chat] Add Stream Log',
  props<{ log: string }>()
);

// NEW: Update the sources for the current stream
export const updateStreamSources = createAction(
  '[Chat] Update Stream Sources',
  props<{ sources: Source[] }>()
);

export const streamComplete = createAction(
  '[Chat] Stream Complete',
  props<{ chatId: string }>()
);

export const streamFailure = createAction(
  '[Chat] Stream Failure',
  props<{ error: string }>()
);

// --- CHAT MANAGEMENT ---
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

export const clearActiveChat = createAction(
  '[Chat] Clear Active Chat'
);

export const deleteAllChats = createAction(
  '[Chat] Delete All Chats'
);

// --- SEARCH ACTIONS ---
export const searchChats = createAction(
  '[Chat] Search Chats',
  props<{ query: string }>()
);

export const searchChatsSuccess = createAction(
  '[Chat] Search Chats Success',
  props<{ results: any[] }>()
);

export const searchChatsFailure = createAction(
  '[Chat] Search Chats Failure',
  props<{ error: string }>()
);

// --- UTILITY ACTIONS (STT/Vision/Translate) ---
export const transcribeAudio = createAction(
  '[Chat] Transcribe Audio',
  props<{ file: File }>()
);

export const transcribeAudioSuccess = createAction(
  '[Chat API] Transcribe Audio Success',
  props<{ text: string }>()
);

export const transcribeAudioFailure = createAction(
  '[Chat API] Transcribe Audio Failure',
  props<{ error: string }>()
);

export const analyzeImage = createAction(
  '[Chat] Analyze Image',
  props<{ imageUrl: string; prompt?: string }>()
);

export const analyzeImageSuccess = createAction(
  '[Chat API] Analyze Image Success',
  props<{ imageUrl: string; result: string }>()
);

export const analyzeImageFailure = createAction(
  '[Chat API] Analyze Image Failure',
  props<{ error: string }>()
);

export const translateText = createAction(
  '[Chat] Translate Text',
  props<{ text: string; targetLanguage: string }>()
);

export const translateTextSuccess = createAction(
  '[Chat API] Translate Text Success',
  props<{ translated: string }>()
);

export const translateTextFailure = createAction(
  '[Chat API] Translate Text Failure',
  props<{ error: string }>()
);