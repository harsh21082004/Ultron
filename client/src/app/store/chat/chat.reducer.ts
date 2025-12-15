import { createReducer, on } from '@ngrx/store';
import { initialChatState, ContentBlock, ChatMessage } from './chat.state';
import * as ChatActions from './chat.actions';

export const chatReducer = createReducer(
  initialChatState,

  // --- Handlers for Loading Chat History ---
  
  on(ChatActions.loadChatHistory, (state, { chatId }) => ({
    ...state,
    isLoading: true,
    error: null,
    messages: [], // Clear old messages
    currentChatId: chatId, // Set the new chat ID
  })),

  on(ChatActions.loadChatHistorySuccess, (state, { messages }) => ({
    ...state,
    isLoading: false,
    messages: messages,
  })),

  on(ChatActions.loadChatHistoryFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
    currentChatId: null, // Clear ID on failure
  })),

  // --- Handler for Clearing the Active Chat (for /chat route) ---
  on(ChatActions.clearActiveChat, (state) => ({
    ...state,
    messages: [],
    currentChatId: null, // Clear the chat ID
    isLoading: false,
    error: null,
    streamStatus: null
  })),


  // --- Handlers for Real-Time Chat ---
  
  on(ChatActions.sendMessage, (state, { message, chatId, image }) => {
    // 1. Create User Message
    const contentBlocks: ContentBlock[] = [];
    
    // Add text block
    if (message.trim()) {
        contentBlocks.push({ type: 'text', value: message });
    }
    
    // Add image block if present
    if (image) {
        contentBlocks.push({ type: 'image_url', value: image });
    }

    const userMsg: ChatMessage = {
      _id: crypto.randomUUID(),
      sender: 'user',
      content: contentBlocks,
      // No timestamps needed, backend will add
    };

    // 2. Create Placeholder AI Message (for streaming)
    const aiPlaceholder: ChatMessage = {
      _id: "temp-id", // The temporary AI message
      sender: 'ai',
      content: [{ type: 'text', value: '' }], // Empty start
      isStreaming: true
    };

    return {
      ...state,
      isLoading: true, // Show loading until stream starts
      isStreaming: true,
      // Initialize Status Object with empty steps
      streamStatus: { current: 'Thinking...', steps: [] }, 
      error: null,
      currentChatId: chatId, // Set chat ID when sending
      messages: [...state.messages, userMsg, aiPlaceholder],
    };
  }),

  on(ChatActions.streamStarted, (state) => ({
    ...state,
    isLoading: false, // Stop loading spinner, stream has begun
    // Note: isStreaming remains true
  })),

  // --- NEW: Handle Status Updates (e.g., "Analyzing Image...") ---
  on(ChatActions.updateStreamStatus, (state, { status }) => ({
    ...state,
    streamStatus: state.streamStatus 
      ? { ...state.streamStatus, current: status }
      : { current: status, steps: [] }
  })),

  // --- NEW: Add Log Step (Reasoning) ---
  on(ChatActions.addStreamLog, (state, { log }) => {
    // If no messages exist, we can't attach reasoning
    if (state.messages.length === 0) {
      return state;
    }

    // 1. Copy the messages array to maintain immutability
    const updatedMessages = [...state.messages];
    const lastMsgIndex = updatedMessages.length - 1;

    // 2. Copy the last message (the AI message currently streaming)
    const lastMessage = { ...updatedMessages[lastMsgIndex] };

    // 3. Append the new log to the reasoning array
    // We check if reasoning exists; if not, initialize it.
    const currentReasoning = lastMessage.reasoning ? [...lastMessage.reasoning] : [];
    currentReasoning.push(log);

    lastMessage.reasoning = currentReasoning;
    
    // 4. Update the array with the modified message
    updatedMessages[lastMsgIndex] = lastMessage;

    return {
      ...state,
      messages: updatedMessages
    };
  }),

  on(ChatActions.receiveStreamChunk, (state, { chunk }) => {
    // This logic appends the new chunk to the last (streaming) message
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
       // This is the first chunk or previous block wasn't text, create a new text block
       newContent.push({ type: 'text', value: chunk });
    }

    lastMessage.content = newContent;
    messages[lastMessageIndex] = lastMessage;

    return {
      ...state,
      messages,
      isLoading: false // Ensure loading is off as we are receiving data
    };
  }),

  on(ChatActions.streamComplete, (state) => {
    if (state.messages.length === 0) return state;
    
    const messages = [...state.messages];
    const lastMessageIndex = messages.length - 1;
    const lastMessage = { ...messages[lastMessageIndex] };

    if (lastMessage?.sender !== 'ai') return state;

    // Finalize the message
    lastMessage.isStreaming = false;
    if (lastMessage._id === "temp-id") {
        lastMessage._id = crypto.randomUUID(); // Replace "temp-id" with real UUID
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

  on(ChatActions.streamFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    isStreaming: false,
    streamStatus: null,
    error: error,
  })),

  // --- Handlers for Chat List (Sidebar) ---
  
  on(ChatActions.getAllChats,(state)=> ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(ChatActions.getAllChatsSuccess, (state, { chats }) => ({
    ...state,
    isLoading: false,
    chatList: chats,
  })),

  on(ChatActions.getAllChatsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
  })),

  // --- Handler for Local Update (No Reload Flash) ---
  
  on(ChatActions.saveChatHistorySuccess, (state, { chatId, newTitle }) => ({
    ...state,
    // Update the title of the chat in the chatList locally
    chatList: state.chatList ? state.chatList.map(chat => 
      chat._id === chatId 
        ? { ...chat, title: newTitle } 
        : chat 
    ) : []
  })),

  on(ChatActions.saveChatHistoryFailure, (state, { error }) => ({
    ...state,
    error: error,
  })),
  // --- NEW SEARCH HANDLERS ---
  on(ChatActions.searchChats, (state) => ({
    ...state,
    isSearching: true,
    error: null
  })),

  on(ChatActions.searchChatsSuccess, (state, { results }) => ({
    ...state,
    isSearching: false,
    searchResults: results
  })),

  on(ChatActions.searchChatsFailure, (state, { error }) => ({
    ...state,
    isSearching: false,
    error: error
  })),

  on(ChatActions.stopStream, (state)=>({
    ...state,
    isLoading: false,
    isStreaming: false,
    streamStatus: null
  })),

  // --- STT ---
  on(ChatActions.transcribeAudio, (state) => ({
    ...state,
    isTranscribing: true,
    error: null,
  })),
  on(ChatActions.transcribeAudioSuccess, (state, { text }) => ({
    ...state,
    isTranscribing: false,
    lastTranscription: text,
  })),
  on(ChatActions.transcribeAudioFailure, (state, { error }) => ({
    ...state,
    isTranscribing: false,
    error,
  })),

  // --- VISION ---
  on(ChatActions.analyzeImage, (state) => ({
    ...state,
    isAnalyzingImage: true,
    error: null,
  })),
  on(ChatActions.analyzeImageSuccess, (state, { imageUrl, result }) => ({
    ...state,
    isAnalyzingImage: false,
    lastVisionResult: result,
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
  on(ChatActions.analyzeImageFailure, (state, { error }) => ({
    ...state,
    isAnalyzingImage: false,
    error,
  })),

  // --- TRANSLATE ---
  on(ChatActions.translateText, (state) => ({
    ...state,
    isTranslating: true,
    error: null,
  })),
  on(ChatActions.translateTextSuccess, (state, { translated }) => ({
    ...state,
    isTranslating: false,
    lastTranslation: translated,
  })),
  on(ChatActions.translateTextFailure, (state, { error }) => ({
    ...state,
    isTranslating: false,
    error,
  }))
);