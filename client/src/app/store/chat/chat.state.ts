export interface ContentBlock {
  // UPDATED: Added 'image_url' to the valid types
  type: 'text' | 'code' | 'table' | 'image' | 'image_url' | 'video';
  value: string;
  language?: string;
}

// NEW: Interface for Source Citations
export interface Source {
  title: string;
  uri: string;
  icon?: string;
  citationIndices?: number[];
}

export interface ChatMessage {
  _id: string;
  sender: 'user' | 'ai';
  content: ContentBlock[];
  // Made optional because backend responses might not always carry it immediately
  timestamp?: Date; 
  isStreaming?: boolean;
  
  // NEW: Persist reasoning steps and status in the message itself
  status?: string; 
  reasoning?: string[]; 
  
  // NEW: Array of sources used for this message
  sources?: Source[];
}

// Structured Status for Real-time Thinking UI
export interface StreamStatus {
  current: string;
  steps: string[];
}

export interface ChatState {
  chatId: string | null;
  title?: string | null;
  // Using currentChatId in reducer, mapping to chatId here for consistency
  currentChatId?: string | null; 
  shareUrl?: string | null;
  shareId?: string | null;
  messages: ChatMessage[]; 
  isLoading: boolean;
  isStreaming: boolean;
  streamStatus: StreamStatus | null;
  error: string | null;
  isSharing?: boolean;

  // Sidebar / Management State
  // FIXED: Removed '?' to ensure it is always typed as an array (even if empty)
  chatList: any[]; 
  
  // Feature flags/states (Added these to match your reducer logic)
  isSearching?: boolean;
  searchResults?: any[];
  isTranscribing?: boolean;
  lastTranscription?: string;
  isAnalyzingImage?: boolean;
  lastVisionResult?: string;
  isTranslating?: boolean;
  lastTranslation?: string;

}

export const initialChatState: ChatState = {
  chatId: null,
  title: null,
  currentChatId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamStatus: null,
  error: null,
  chatList: [], // Initialized as empty array
  isSearching: false,
  searchResults: [],
  isTranscribing: false,
  isAnalyzingImage: false,
  isTranslating: false,
  shareId: null,
  shareUrl: null,
  isSharing: false
};