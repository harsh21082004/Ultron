// chat.state.ts

// --- 1. Content Interfaces ---

export interface ContentBlock {
  type: 'text' | 'code' | 'table' | 'image' | 'image_url' | 'video';
  value: string;
  language?: string; // Optional, primarily for 'code' blocks
}

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
  
  // Backend often sends dates as ISO strings, so we allow both
  timestamp?: Date | string; 
  
  // Streaming & AI Meta-data
  isStreaming?: boolean;
  status?: string;         // e.g., "Thinking", "Searching"
  reasoning?: string[];    // Chain of thought logs
  sources?: Source[];      // RAG Sources
}

// --- 2. List & Sidebar Interfaces ---

// Describes a chat item in the sidebar list (lighter than full history)
export interface ChatSession {
  _id: string;
  title: string;
  userId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastMessage?: string;
}

// Structured Status for Real-time Thinking UI
export interface StreamStatus {
  current: string;
  steps: string[];
}

// --- 3. Main State ---

export interface ChatState {
  // Navigation
  currentChatId: string | null; // The Single Source of Truth for the active chat
  title?: string | null;        // Title of the currently active chat
  
  // Active Conversation Data
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamStatus: StreamStatus | null;
  error: string | null;
  
  // Sidebar / Management State
  chatList: ChatSession[];      // Typed array
  isSearching: boolean;
  searchResults: ChatSession[]; // Typed array
  
  // Sharing Feature
  shareUrl?: string | null;
  shareId?: string | null;
  isSharing?: boolean;

  // Tool / Utility States
  isTranscribing?: boolean;
  lastTranscription?: string;
  isAnalyzingImage?: boolean;
  lastVisionResult?: string;
  isTranslating?: boolean;
  lastTranslation?: string;
}

// --- 4. Initial State ---

export const initialChatState: ChatState = {
  currentChatId: null,
  title: null,
  
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamStatus: null,
  error: null,
  
  chatList: [],
  isSearching: false,
  searchResults: [],
  
  shareId: null,
  shareUrl: null,
  isSharing: false,
  
  isTranscribing: false,
  isAnalyzingImage: false,
  isTranslating: false
};