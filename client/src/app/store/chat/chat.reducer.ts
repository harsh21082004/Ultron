import { createReducer, on } from '@ngrx/store';
import { initialChatState, ContentBlock, ChatMessage } from './chat.state';
import { ChatPageActions, ChatApiActions } from './chat.actions';

export const chatReducer = createReducer(
  initialChatState,

  // --- 1. Navigation & Loading ---
  on(ChatPageActions.enterChat, (state, { chatId }) => ({
    ...state,
    isLoading: true,
    error: null,
    messages: [], // Clear old messages
    currentChatId: chatId, // Set the new chat ID
  })),

  on(ChatApiActions.loadChatHistorySuccess, (state, { messages }) => ({
    ...state,
    isLoading: false,
    messages: messages,
  })),

  on(ChatApiActions.loadChatHistoryFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
    currentChatId: null, // Clear ID on failure
  })),

  on(ChatPageActions.clearActiveChat, (state) => ({
    ...state,
    messages: [],
    currentChatId: null,
    isLoading: false,
    error: null,
    streamStatus: null
  })),

  // --- 2. Real-Time Chat & Streaming ---
  on(ChatPageActions.sendMessage, (state, { message, chatId, attachments }) => {
    
    // 1. Create User Message Content
    const contentBlocks: ContentBlock[] = [];
    
    // A. Push Attachments FIRST (Images above text)
    if (attachments && attachments.length > 0) {
        attachments.forEach(att => {
            contentBlocks.push({ 
                type: att.type as any, // 'image_url' or 'file'
                value: att.url 
            });
        });
    }

    // B. Push Text SECOND
    if (message && message.trim()) {
        contentBlocks.push({ type: 'text', value: message });
    }

    const userMsg: ChatMessage = {
      _id: crypto.randomUUID(),
      sender: 'user',
      content: contentBlocks,
      // The backend will save these content blocks, containing the GCS URLs
    };

    const aiPlaceholder: ChatMessage = {
      _id: "temp-id", // Temporary ID
      sender: 'ai',
      content: [{ type: 'text', value: '' }], // Empty start
      isStreaming: true
    };

    return {
      ...state,
      isLoading: true,
      isStreaming: true,
      streamStatus: { current: 'Thinking...', steps: [] }, 
      error: null,
      currentChatId: chatId,
      messages: [...state.messages, userMsg, aiPlaceholder],
    };
  }),

  on(ChatApiActions.streamStarted, (state) => ({
    ...state,
    isLoading: false, // Stop loading spinner, stream has begun
    // Note: isStreaming remains true
  })),

  // Handle Status Updates (e.g., "Analyzing Image...")
  on(ChatApiActions.updateStreamStatus, (state, { status }) => ({
    ...state,
    streamStatus: state.streamStatus 
      ? { ...state.streamStatus, current: status }
      : { current: status, steps: [] }
  })),

  // Add Log Step (Reasoning)
  on(ChatApiActions.addStreamLog, (state, { log }) => {
    if (state.messages.length === 0) return state;

    // Immutable update of the last message's reasoning array
    const updatedMessages = [...state.messages];
    const lastMsgIndex = updatedMessages.length - 1;
    const lastMessage = { ...updatedMessages[lastMsgIndex] };

    const currentReasoning = lastMessage.reasoning ? [...lastMessage.reasoning] : [];
    currentReasoning.push(log);

    lastMessage.reasoning = currentReasoning;
    updatedMessages[lastMsgIndex] = lastMessage;

    return {
      ...state,
      messages: updatedMessages
    };
  }),

  // Add Sources
  on(ChatApiActions.updateStreamSources, (state, { sources }) => {
    if (state.messages.length === 0) return state;

    const updatedMessages = [...state.messages];
    const lastMsgIndex = updatedMessages.length - 1;
    const lastMessage = { ...updatedMessages[lastMsgIndex] };

    lastMessage.sources = sources;
    updatedMessages[lastMsgIndex] = lastMessage;

    return {
      ...state,
      messages: updatedMessages
    };
  }),

  // Handle Text Chunks (The actual answer)
  on(ChatApiActions.receiveStreamChunk, (state, { chunk }) => {
    if (state.messages.length === 0) return state;
    
    const messages = [...state.messages];
    const lastMessageIndex = messages.length - 1;
    const lastMessage = { ...messages[lastMessageIndex] };
    
    // Safety check: only modify the streaming AI message
    if (lastMessage?.sender !== 'ai' || !lastMessage.isStreaming) return state;

    // Ensure content array is copied
    let newContent = [...lastMessage.content];
    
    // Find or create the last text block
    if (newContent.length > 0 && newContent[newContent.length - 1].type === 'text') {
       // Copy the block to update it immutably
       const lastBlock = { ...newContent[newContent.length - 1] };
       lastBlock.value += chunk;
       newContent[newContent.length - 1] = lastBlock;
    } else {
       // Create a new text block
       newContent.push({ type: 'text', value: chunk });
    }

    lastMessage.content = newContent;
    messages[lastMessageIndex] = lastMessage;

    return {
      ...state,
      messages,
      isLoading: false 
    };
  }),

  on(ChatApiActions.streamComplete, (state, { chatId }) => {
    if (state.messages.length === 0) return state;
    
    const messages = [...state.messages];
    const lastMessageIndex = messages.length - 1;
    const lastMessage = { ...messages[lastMessageIndex] };

    if (lastMessage?.sender !== 'ai') return state;

    // Finalize the message
    lastMessage.isStreaming = false;
    if (lastMessage._id === "temp-id") {
        lastMessage._id = crypto.randomUUID(); 
    }
    messages[lastMessageIndex] = lastMessage;

    return {
      ...state,
      isLoading: false,
      isStreaming: false,
      streamStatus: null, // Clear status when done
      messages
    };
  }),

  on(ChatApiActions.streamFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    isStreaming: false,
    streamStatus: null,
    error: error,
  })),

  on(ChatPageActions.stopStream, (state) => ({
    ...state,
    isLoading: false,
    isStreaming: false,
    streamStatus: null
  })),

  // --- 3. Chat Management (Sidebar) ---

  on(ChatPageActions.getAllChats, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(ChatApiActions.getAllChatsSuccess, (state, { chats }) => ({
    ...state,
    isLoading: false,
    chatList: chats,
  })),

  on(ChatApiActions.getAllChatsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
  })),

  // Local Update (No Reload Flash) when title changes
  on(ChatApiActions.saveChatHistorySuccess, (state, { chatId, newTitle }) => ({
    ...state,
    chatList: state.chatList ? state.chatList.map(chat => 
      chat._id === chatId 
        ? { ...chat, title: newTitle } 
        : chat 
    ) : []
  })),

  on(ChatApiActions.saveChatHistoryFailure, (state, { error }) => ({
    ...state,
    error: error,
  })),

  // --- 4. Search ---

  on(ChatPageActions.searchChats, (state) => ({
    ...state,
    isSearching: true,
    error: null
  })),

  on(ChatApiActions.searchChatsSuccess, (state, { results }) => ({
    ...state,
    isSearching: false,
    searchResults: results
  })),

  on(ChatApiActions.searchChatsFailure, (state, { error }) => ({
    ...state,
    isSearching: false,
    error: error
  })),

  // --- 5. Sharing ---

  on(ChatPageActions.shareChat, (state) => ({
    ...state,
    isSharing: true,
    error: null,
  })),

  on(ChatApiActions.shareChatSuccess, (state, { shareUrl, shareId }) => ({
    ...state,
    shareUrl: shareUrl,
    shareId: shareId,
    isSharing: false,
  })),

  on(ChatApiActions.shareChatFailure, (state, { error }) => ({
    ...state,
    error,
    isSharing: false,
  })),

  on(ChatPageActions.loadSharedChat, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(ChatPageActions.clearShareState, (state) => ({
    ...state,
    shareUrl: null,
    shareId: null,
    isSharing: false,
    error: null
  })),

  on(ChatApiActions.loadSharedChatSuccess, (state, { messages, title, shareId }) => ({
    ...state,
    isLoading: false,
    messages: messages,
    title: title,
    shareId: shareId
  })),

  on(ChatApiActions.loadSharedChatFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
  })),
  
  on(ChatApiActions.saveSharedConversationSuccess, (state, { chatId }) => ({
      ...state,
      currentChatId: chatId
  })),

  // --- 6. Tools (STT, Vision, Translate) ---

  // Audio / STT
  on(ChatPageActions.transcribeAudio, (state) => ({
    ...state,
    isTranscribing: true,
    error: null,
  })),
  on(ChatApiActions.transcribeAudioSuccess, (state, { text }) => ({
    ...state,
    isTranscribing: false,
    lastTranscription: text,
  })),
  on(ChatApiActions.transcribeAudioFailure, (state, { error }) => ({
    ...state,
    isTranscribing: false,
    error,
  })),

  // Vision
  on(ChatPageActions.analyzeImage, (state) => ({
    ...state,
    isAnalyzingImage: true,
    error: null,
  })),
  on(ChatApiActions.analyzeImageSuccess, (state, { imageUrl, result }) => ({
    ...state,
    isAnalyzingImage: false,
    lastVisionResult: result,
    // Add the vision result as a new message pair immediately (optional logic, based on your UX)
    messages: [
      ...state.messages,
      {
        _id: crypto.randomUUID(),
        sender: 'ai',
        content: [
          { type: 'image_url', value: imageUrl },
          { type: 'text', value: result },
        ],
      },
    ],
  })),
  on(ChatApiActions.analyzeImageFailure, (state, { error }) => ({
    ...state,
    isAnalyzingImage: false,
    error,
  })),

  // Translate
  on(ChatPageActions.translateText, (state) => ({
    ...state,
    isTranslating: true,
    error: null,
  })),
  on(ChatApiActions.translateTextSuccess, (state, { translated }) => ({
    ...state,
    isTranslating: false,
    lastTranslation: translated,
  })),
  on(ChatApiActions.translateTextFailure, (state, { error }) => ({
    ...state,
    isTranslating: false,
    error,
  }))
);