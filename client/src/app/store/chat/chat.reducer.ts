import { createReducer, on } from '@ngrx/store';
import { initialChatState, ContentBlock, ChatMessage } from './chat.state';
import { ChatPageActions, ChatApiActions } from './chat.actions';

export const chatReducer = createReducer(
  initialChatState,

  // ... (Keep your enterChat, loadChatHistory, setCurrentLeaf, clearActiveChat handlers as they are) ...
  on(ChatPageActions.enterChat, (state, { chatId }) => ({
    ...state, isLoading: true, error: null, messages: [], currentChatId: chatId, currentLeafId: null
  })),
  on(ChatApiActions.loadChatHistorySuccess, (state, { messages, currentLeafId }) => ({
    ...state, isLoading: false, messages: messages, currentLeafId: currentLeafId
  })),
  on(ChatPageActions.setCurrentLeaf, (state, { leafId }) => ({
    ...state, currentLeafId: leafId
  })),
  on(ChatPageActions.clearActiveChat, (state) => ({
    ...state, messages: [], currentChatId: null, currentLeafId: null, isLoading: false, error: null, streamStatus: null
  })),

  on(ChatPageActions.sendMessage, (state, { message, chatId, parentMessageId, attachments }) => {
    const userMsgId = crypto.randomUUID();
    const contentBlocks: ContentBlock[] = [];
    if (attachments?.length) attachments.forEach(att => contentBlocks.push({ type: att.type as any, value: att.url }));
    if (message?.trim()) contentBlocks.push({ type: 'text', value: message });

    const userMsg: ChatMessage = {
      _id: userMsgId, sender: 'user', content: contentBlocks,
      parentMessageId: parentMessageId, childrenIds: [], isGeneratingImage: false
    };

    // AI Placeholder
    const aiMsgId = "temp-id-" + crypto.randomUUID();
    const aiPlaceholder: ChatMessage = {
      _id: aiMsgId, sender: 'ai', content: [{ type: 'text', value: '' }],
      isStreaming: true, parentMessageId: userMsgId, childrenIds: [], isGeneratingImage: false,
      // [FIX] Initialize with default 'logo' or current state
      agentIcon: 'logo' 
    };

    let updatedMessages = [...state.messages];
    if (parentMessageId) {
      const parentIndex = updatedMessages.findIndex(m => m._id === parentMessageId);
      if (parentIndex > -1) {
        const parent = { ...updatedMessages[parentIndex] };
        if (!parent.childrenIds.includes(userMsgId)) {
          parent.childrenIds = [...parent.childrenIds, userMsgId];
        }
        updatedMessages[parentIndex] = parent;
      }
    }

    userMsg.childrenIds = [aiMsgId];
    updatedMessages.push(userMsg, aiPlaceholder);

    return {
      ...state,
      isLoading: true, isStreaming: true,
      messages: updatedMessages,
      currentChatId: chatId,
      currentLeafId: aiMsgId,
      streamStatus: { current: 'Thinking...', steps: [] },
      error: null,
      currentAgentIcon: 'logo' // Reset icon start of new turn
    };
  }),

  // --- STREAMING ACTIONS ---

  // [CRITICAL FIX] Update Agent Icon
  // This updates the global state AND the specific message currently streaming
  on(ChatApiActions.updateAgentIcon, (state, { icon }) => {
    const messages = state.messages.map(msg => {
      if (msg.isStreaming && msg.sender === 'ai') {
        return { ...msg, agentIcon: icon }; // Update live message
      }
      return msg;
    });
    
    return { 
      ...state, 
      currentAgentIcon: icon, 
      messages 
    };
  }),

  on(ChatApiActions.receiveStreamChunk, (state, { chunk }) => {
    const messages = [...state.messages];
    // Find the streaming message at the end of the current branch
    const targetIndex = messages.findIndex(m => m._id === state.currentLeafId && m.isStreaming);
    
    if (targetIndex === -1) return state;

    const lastMessage = { ...messages[targetIndex] };
    
    // [FIX] Ensure icon is set if it wasn't before
    if (!lastMessage.agentIcon) lastMessage.agentIcon = state.currentAgentIcon || 'logo';

    let newContent = [...lastMessage.content];
    if (newContent.length > 0 && newContent[newContent.length - 1].type === 'text') {
      const lastBlock = { ...newContent[newContent.length - 1] };
      lastBlock.value += chunk;
      newContent[newContent.length - 1] = lastBlock;
    } else {
      newContent.push({ type: 'text', value: chunk });
    }
    lastMessage.content = newContent;
    messages[targetIndex] = lastMessage;
    
    return { ...state, messages, isLoading: false };
  }),

  on(ChatApiActions.updateSkeleton, (state, { skeleton }) => ({
    ...state,
    messages: state.messages.map((msg) => {
      if (msg._id === state.currentLeafId && msg.sender === 'ai') {
        return { 
            ...msg, 
            isGeneratingImage: skeleton === 'start',
            // [FIX] Ensure icon is synced when skeleton starts (often happens on tool switch)
            agentIcon: state.currentAgentIcon || msg.agentIcon 
        };
      }
      return msg;
    })
  })),

  // ... (Rest of your reducers: streamStarted, updateStreamStatus, addStreamLog, etc.) ...
  // Keep them exactly as they were, just ensure `messages` array is immutably updated.
  
  on(ChatApiActions.streamStarted, (state) => ({ ...state, isLoading: false })),
  on(ChatApiActions.updateStreamStatus, (state, { status }) => ({
    ...state, streamStatus: state.streamStatus ? { ...state.streamStatus, current: status } : { current: status, steps: [] }
  })),
  on(ChatApiActions.addStreamLog, (state, { log }) => {
    const messages = [...state.messages];
    const targetIndex = messages.findIndex(m => m.isStreaming);
    if (targetIndex === -1) return state;
    const lastMessage = { ...messages[targetIndex] };
    lastMessage.reasoning = lastMessage.reasoning ? [...lastMessage.reasoning, log] : [log];
    messages[targetIndex] = lastMessage;
    return { ...state, messages };
  }),
  on(ChatApiActions.updateStreamSources, (state, { sources }) => {
    const messages = [...state.messages];
    const targetIndex = messages.findIndex(m => m.isStreaming);
    if (targetIndex === -1) return state;
    const lastMessage = { ...messages[targetIndex] };
    lastMessage.sources = sources;
    messages[targetIndex] = lastMessage;
    return { ...state, messages };
  }),
  on(ChatApiActions.streamComplete, (state, { agentName }) => {
    const messages = [...state.messages];
    const targetIndex = messages.findIndex(m => m.isStreaming);
    if (targetIndex === -1) return state;
    const lastMessage = { ...messages[targetIndex], agentName: agentName };
    const oldId = lastMessage._id;
    lastMessage.isStreaming = false;
    let newId = oldId;
    if (oldId.startsWith("temp-id")) {
      newId = crypto.randomUUID();
      lastMessage._id = newId;
    }
    messages[targetIndex] = lastMessage;
    if (lastMessage.parentMessageId && newId !== oldId) {
      const parentIndex = messages.findIndex(m => m._id === lastMessage.parentMessageId);
      if (parentIndex > -1) {
        const parent = { ...messages[parentIndex] };
        parent.childrenIds = parent.childrenIds.map(c => c === oldId ? newId : c);
        messages[parentIndex] = parent;
      }
    }
    return { ...state, isLoading: false, isStreaming: false, streamStatus: null, messages, currentLeafId: newId };
  }),
  
  // ... (The rest of your existing reducers for search, load, etc. - keep them)
  on(ChatApiActions.streamFailure, (state, { error }) => ({ ...state, isLoading: false, isStreaming: false, streamStatus: null, error })),
  on(ChatPageActions.stopStream, (state) => ({ ...state, isLoading: false, isStreaming: false, streamStatus: null })),
  on(ChatPageActions.getAllChats, (state) => ({ ...state, isLoading: true, error: null })),
  on(ChatApiActions.getAllChatsSuccess, (state, { chats }) => ({ ...state, isLoading: false, chatList: chats })),
  on(ChatApiActions.getAllChatsFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
  on(ChatApiActions.saveChatHistorySuccess, (state, { chatId, newTitle }) => ({ ...state, chatList: state.chatList ? state.chatList.map(chat => chat._id === chatId ? { ...chat, title: newTitle } : chat) : [] })),
  on(ChatPageActions.shareChat, (state) => ({ ...state, isSharing: true, error: null })),
  on(ChatApiActions.shareChatSuccess, (state, { shareUrl, shareId }) => ({ ...state, shareUrl, shareId, isSharing: false })),
  on(ChatApiActions.shareChatFailure, (state, { error }) => ({ ...state, error, isSharing: false })),
  on(ChatPageActions.loadSharedChat, (state) => ({ ...state, isLoading: true, error: null })),
  on(ChatPageActions.clearShareState, (state) => ({ ...state, shareUrl: null, shareId: null, isSharing: false, error: null })),
  on(ChatApiActions.loadSharedChatSuccess, (state, { messages, title, shareId, currentLeafId }) => ({ ...state, isLoading: false, messages, title, shareId, currentLeafId })),
  on(ChatApiActions.loadSharedChatFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
  on(ChatApiActions.saveSharedConversationSuccess, (state, { chatId }) => ({ ...state, currentChatId: chatId })),
  on(ChatPageActions.transcribeAudio, (state) => ({ ...state, isTranscribing: true, error: null })),
  on(ChatApiActions.transcribeAudioSuccess, (state, { text }) => ({ ...state, isTranscribing: false, lastTranscription: text })),
  on(ChatApiActions.transcribeAudioFailure, (state, { error }) => ({ ...state, isTranscribing: false, error })),
  on(ChatPageActions.analyzeImage, (state) => ({ ...state, isAnalyzingImage: true, error: null })),
  on(ChatApiActions.analyzeImageSuccess, (state, { imageUrl, result }) => ({ ...state, isAnalyzingImage: false, lastVisionResult: result })),
  on(ChatApiActions.analyzeImageFailure, (state, { error }) => ({ ...state, isAnalyzingImage: false, error })),
  on(ChatPageActions.translateText, (state) => ({ ...state, isTranslating: true, error: null })),
  on(ChatApiActions.translateTextSuccess, (state, { translated }) => ({ ...state, isTranslating: false, lastTranslation: translated })),
  on(ChatApiActions.translateTextFailure, (state, { error }) => ({ ...state, isTranslating: false, error })),
  on(ChatPageActions.searchChats, (state) => ({ ...state, isSearching: true, error: null })),
  on(ChatApiActions.searchChatsSuccess, (state, { results }) => ({ ...state, isSearching: false, searchResults: results })),
  on(ChatApiActions.searchChatsFailure, (state, { error }) => ({ ...state, isSearching: false, error })),
  on(ChatApiActions.updateActiveAgent, (state, { agentName }) => ({ ...state, currentAgentName: agentName })),
);