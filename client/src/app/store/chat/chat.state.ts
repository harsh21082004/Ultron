export interface ContentBlock {
  type: 'text' | 'code' | 'table' | 'image' | 'image_url' | 'video';
  value: string;
  language?: string;
}

export interface Source {
  title: string; uri: string; icon?: string; citationIndices?: number[];
}

export interface ChatMessage {
  _id: string;
  
  // --- TREE POINTERS ---
  parentMessageId: string | null;
  childrenIds: string[];
  // ---------------------

  sender: 'user' | 'ai';
  content: ContentBlock[];
  
  // [ADDED] The specific icon for THIS message
  agentIcon?: string; 
  agentName?: string;
  
  timestamp?: Date | string;
  isStreaming?: boolean;
  status?: string;
  reasoning?: string[];
  sources?: Source[];
  
  // Changed from 'any' to boolean
  isGeneratingImage?: boolean; 
}

export interface ChatSession {
  _id: string; title: string; userId: string;
  createdAt?: Date | string; updatedAt?: Date | string; lastMessage?: string;
}

export interface StreamStatus { current: string; steps: string[]; }

export interface ChatState {
  currentChatId: string | null;
  title?: string | null;
  
  messages: ChatMessage[]; 
  currentLeafId: string | null; 

  isLoading: boolean;
  isStreaming: boolean;
  streamStatus: StreamStatus | null;
  error: string | null;
  
  currentAgentName?: string | null;
  
  // This tracks the LIVE icon state, used when creating NEW messages
  currentAgentIcon?: string | null; 
  
  chatList: ChatSession[];
  isSearching: boolean;
  searchResults: ChatSession[];
  
  shareUrl?: string | null;
  shareId?: string | null;
  isSharing?: boolean;

  isTranscribing?: boolean; lastTranscription?: string;
  isAnalyzingImage?: boolean; lastVisionResult?: string;
  isTranslating?: boolean; lastTranslation?: string;
  isGeneratingImage?: boolean;
}

export const initialChatState: ChatState = {
  currentChatId: null, title: null,
  messages: [], currentLeafId: null,
  isLoading: false, isStreaming: false, streamStatus: null, error: null,
  chatList: [], isSearching: false, searchResults: [],
  shareId: null, shareUrl: null, isSharing: false,
  isTranscribing: false, isAnalyzingImage: false, isTranslating: false,
  // Default icon
  currentAgentIcon: 'logo' 
};