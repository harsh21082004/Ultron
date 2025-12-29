import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ChatMessage, Source } from './chat.state';

export interface Attachment { type: 'image_url' | 'file'; url: string; name: string; }

export const ChatPageActions = createActionGroup({
  source: 'Chat Page',
  events: {
    'Enter Chat': props<{ chatId: string }>(),
    'Clear Active Chat': emptyProps(),
    'Get All Chats': props<{ userId: string }>(),
    'Delete All Chats': emptyProps(),
    'Search Chats': props<{ query: string }>(),
    
    // UPDATED: send message requires parent
    'Send Message': props<{ 
        message: string; 
        chatId: string; 
        parentMessageId: string | null; 
        image?: string, 
        attachments: Attachment[]; 
        base64Files: string[]; 
    }>(),
    
    'Stop Stream': emptyProps(),
    // NEW: Navigation
    'Set Current Leaf': props<{ leafId: string }>(),

    'Transcribe Audio': props<{ file: File }>(),
    'Analyze Image': props<{ imageUrl: string; prompt?: string }>(),
    'Translate Text': props<{ text: string; targetLanguage: string }>(),
    'Share Chat': props<{ chatId: string }>(),
    'Load Shared Chat': props<{ shareId: string }>(),
    'Save Shared Conversation': props<{ shareId: string }>(),
    'Clear Share State': emptyProps()
  }
});

export const ChatApiActions = createActionGroup({
  source: 'Chat API',
  events: {
    // UPDATED: Load success includes leaf
    'Load Chat History Success': props<{ chatId: string, messages: ChatMessage[], currentLeafId: string | null }>(),
    'Load Chat History Failure': props<{ chatId: string, error: string }>(),
    
    'Stream Started': emptyProps(),
    'Update Stream Status': props<{ status: string }>(),
    'Add Stream Log': props<{ log: string }>(),
    'Update Stream Sources': props<{ sources: Source[] }>(),
    'Receive Stream Chunk': props<{ chunk: string }>(),
    'Stream Complete': props<{ chatId: string }>(),
    'Stream Failure': props<{ error: string }>(),

    'Save Chat History Success': props<{ chatId: string, newTitle: string }>(),
    'Save Chat History Failure': props<{ error: string }>(),
    'Hydrate History Success': emptyProps(),
    'Hydrate History Failure': props<{ error: string }>(),

    'Get All Chats Success': props<{ chats: any[] }>(),
    'Get All Chats Failure': props<{ error: string }>(),
    'Search Chats Success': props<{ results: any[] }>(),
    'Search Chats Failure': props<{ error: string }>(),

    'Transcribe Audio Success': props<{ text: string }>(),
    'Transcribe Audio Failure': props<{ error: string }>(),
    'Analyze Image Success': props<{ imageUrl: string; result: string }>(),
    'Analyze Image Failure': props<{ error: string }>(),
    'Translate Text Success': props<{ translated: string }>(),
    'Translate Text Failure': props<{ error: string }>(),

    'Share Chat Success': props<{ shareUrl: string, shareId: string }>(),
    'Share Chat Failure': props<{ error: string }>(),
    // UPDATED
    'Load Shared Chat Success': props<{ messages: ChatMessage[], title: string, createdAt: Date, shareId: string, currentLeafId: string | null }>(),
    'Load Shared Chat Failure': props<{ error: string }>(),
    'Save Shared Conversation Success': props<{ chatId: string }>(),
    'Save Shared Conversation Failure': props<{ error: string }>()
  }
});