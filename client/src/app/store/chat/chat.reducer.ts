import { createReducer, on } from '@ngrx/store';
import { initialChatState, ContentBlock } from './chat.state';
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
  })),


  // --- Handlers for Real-Time Chat ---
  
  on(ChatActions.sendMessage, (state, { message, chatId }) => ({
    ...state,
    isLoading: true, // Show loading until stream starts
    error: null,
    currentChatId: chatId, // Set chat ID when sending
    messages: [
      ...state.messages,
      {
        _id: crypto.randomUUID(), // Create user message ID
        sender: 'user',
        content: [{ type: 'text', value: message }],
        // No timestamps needed, backend will add
      },
    ],
  })),

  on(ChatActions.streamStarted, (state) => ({
    ...state,
    isLoading: false, // Stop loading, stream has begun
    messages: [
      ...state.messages,
      { 
        _id: "temp-id", // The temporary AI message
        sender: 'ai', 
        content: [], 
        isStreaming: true 
      },
    ],
  })),

  on(ChatActions.receiveStreamChunk, (state, { chunk }) => {
    // This logic appends the new chunk to the last (streaming) message
    if (state.messages.length === 0) return state;
    
    const lastMessage = state.messages[state.messages.length - 1];
    
    // Safety check: only modify the streaming AI message
    if (lastMessage?.sender !== 'ai' || !lastMessage.isStreaming) return state;

    // Find the last content block (which should be 'text')
    const lastContentBlock = lastMessage.content[lastMessage.content.length - 1];
    let newContent: ContentBlock[];

    if (lastContentBlock?.type === 'text') {
      // Append to the existing text block
      newContent = [
        ...lastMessage.content.slice(0, -1),
        { ...lastContentBlock, value: lastContentBlock.value + chunk }
      ];
    } else {
      // This is the first chunk, create a new text block
      newContent = [...lastMessage.content, { type: 'text', value: chunk }];
    }

    return {
      ...state,
      messages: [
        ...state.messages.slice(0, -1),
        { ...lastMessage, content: newContent }
      ]
    };
  }),

  on(ChatActions.streamComplete, (state) => {
    if (state.messages.length === 0) return state;
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?.sender !== 'ai') return state;

    return {
      ...state,
      isLoading: false,
      messages: [
        ...state.messages.slice(0, -1),
        { 
          ...lastMessage, 
          isStreaming: false, 
          _id: crypto.randomUUID() // <-- FIX: Replace "temp-id" with real UUID
        }
      ]
    };
  }),

  on(ChatActions.streamFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
  })),

  // --- Handlers for Chat List (Sidebar) ---
  
  on(ChatActions.getAllChats,(state)=> ({
    ...state,
    isLoading: true, // You might want a separate loader for the sidebar
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
    chatList: state.chatList.map(chat => 
      chat._id === chatId 
        ? { ...chat, title: newTitle } // Found it, update the title
        : chat // Not this one, return it as-is
    )
  })),

  on(ChatActions.saveChatHistoryFailure, (state, { error }) => ({
    ...state,
    error: error, // Log the error
  })),

  on(ChatActions.deleteAllChats, (state)=> ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(ChatActions.deleteAllChatsSuccess, (state)=> ({
    ...state,
    isLoading: false,
    chatList: []
  })),
  on(ChatActions.deleteAllChatsFailure, (state, {error}) => ({
    ...state,
    isLoading: false,
    error: error
  }))
);

