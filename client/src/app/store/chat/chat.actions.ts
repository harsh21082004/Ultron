import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ChatMessage, Source } from './chat.state';

// 1. Actions triggered by the User or the UI (Page Events)
export const ChatPageActions = createActionGroup({
  source: 'Chat Page',
  events: {
    // Navigation / Setup
    'Enter Chat': props<{ chatId: string }>(),
    'Clear Active Chat': emptyProps(),
    'Get All Chats': props<{ userId: string }>(),
    'Delete All Chats': emptyProps(),
    'Search Chats': props<{ query: string }>(),
    
    // Interaction
    'Send Message': props<{ message: string; chatId: string; image?: string }>(),
    'Stop Stream': emptyProps(),
    
    // Tools
    'Transcribe Audio': props<{ file: File }>(),
    'Analyze Image': props<{ imageUrl: string; prompt?: string }>(),
    'Translate Text': props<{ text: string; targetLanguage: string }>(),
    
    // Sharing
    'Share Chat': props<{ chatId: string }>(),
    'Load Shared Chat': props<{ shareId: string }>(),
    'Save Shared Conversation': props<{ shareId: string }>(),
    'Clear Share State': emptyProps()
  }
});

// 2. Actions triggered by API Responses (Effects -> Reducer)
export const ChatApiActions = createActionGroup({
  source: 'Chat API',
  events: {
    // History Loading
    'Load Chat History Success': props<{ chatId: string, messages: ChatMessage[] }>(),
    'Load Chat History Failure': props<{ chatId: string, error: string }>(),
    
    // Streaming Flow
    'Stream Started': emptyProps(),
    'Update Stream Status': props<{ status: string }>(),
    'Add Stream Log': props<{ log: string }>(),
    'Update Stream Sources': props<{ sources: Source[] }>(),
    'Receive Stream Chunk': props<{ chunk: string }>(),
    'Stream Complete': props<{ chatId: string }>(),
    'Stream Failure': props<{ error: string }>(),

    // Saving / Title Generation
    'Save Chat History Success': props<{ chatId: string, newTitle: string }>(),
    'Save Chat History Failure': props<{ error: string }>(),
    'Hydrate History Success': emptyProps(),
    'Hydrate History Failure': props<{ error: string }>(),

    // Sidebar Lists
    'Get All Chats Success': props<{ chats: any[] }>(),
    'Get All Chats Failure': props<{ error: string }>(),
    'Search Chats Success': props<{ results: any[] }>(),
    'Search Chats Failure': props<{ error: string }>(),

    // Tools Results
    'Transcribe Audio Success': props<{ text: string }>(),
    'Transcribe Audio Failure': props<{ error: string }>(),
    'Analyze Image Success': props<{ imageUrl: string; result: string }>(),
    'Analyze Image Failure': props<{ error: string }>(),
    'Translate Text Success': props<{ translated: string }>(),
    'Translate Text Failure': props<{ error: string }>(),

    // Sharing Results
    'Share Chat Success': props<{ shareUrl: string, shareId: string }>(),
    'Share Chat Failure': props<{ error: string }>(),
    'Load Shared Chat Success': props<{ messages: ChatMessage[], title: string, createdAt: Date, shareId: string }>(),
    'Load Shared Chat Failure': props<{ error: string }>(),
    'Save Shared Conversation Success': props<{ chatId: string }>(),
    'Save Shared Conversation Failure': props<{ error: string }>()
  }
});