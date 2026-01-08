import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChatState, ChatMessage } from './chat.state';

const selectChatState = createFeatureSelector<ChatState>('chat'); 
const selectMessagesState = createSelector(selectChatState, (state) => state.messages);
const selectAllChatsState = createSelector(selectChatState, (state) => state.chatList);
const selectCurrentChatIdState = createSelector(selectChatState, (state) => state.currentChatId);
const selectCurrentLeafIdState = createSelector(selectChatState, (state) => state.currentLeafId);

export const ChatSelectors = {
  selectChatState,
  selectMessages: selectMessagesState,
  selectAllChats: selectAllChatsState,
  selectCurrentChatId: selectCurrentChatIdState,
  selectCurrentLeafId: selectCurrentLeafIdState,
  
  selectChatTitle: createSelector(selectChatState, (state) => state.title),
  selectStreamStatus: createSelector(selectChatState, (state) => state.streamStatus),
  selectIsLoading: createSelector(selectChatState, (state) => state.isLoading),
  selectIsStreaming: createSelector(selectChatState, (state) => state.isStreaming),
  selectChatError: createSelector(selectChatState, (state) => state.error),
  selectSearchResults: createSelector(selectChatState, (state) => state.searchResults),
  selectIsSearching: createSelector(selectChatState, (state) => state.isSearching),
  selectShareUrl: createSelector(selectChatState, (state) => state.shareUrl),
  selectShareId: createSelector(selectChatState, (state) => state.shareId),
  selectIsSharing: createSelector(selectChatState, (state) => state.isSharing),
  selectCurrentAgentName: createSelector(selectChatState, (state) => state.currentAgentName),
  selectCurrentAgentIcon: createSelector(selectChatState, (state) => state.currentAgentIcon),

  selectCurrentChat: createSelector(
    selectAllChatsState, selectCurrentChatIdState,
    (chats, currentChatId) => chats.find(chat => chat._id === currentChatId)
  ),

  // --- TRAVERSAL ALGORITHM (Leaf -> Root) ---
  selectVisibleThread: createSelector(
    selectMessagesState,
    selectCurrentLeafIdState,
    (messages, leafId) => {
        if (!messages || messages.length === 0) return [];

        const msgMap = new Map<string, ChatMessage>();
        messages.forEach(m => msgMap.set(m._id, m));

        let currentId = leafId;
        // Fallback to last message if no leaf ID is set
        if (!currentId) {
             currentId = messages[messages.length - 1]._id;
        }

        const thread: ChatMessage[] = [];
        let current = msgMap.get(currentId!);
        let safety = 0;
        
        while (current && safety < 10000) {
            thread.unshift(current);
            if (!current.parentMessageId) break; 
            current = msgMap.get(current.parentMessageId);
            safety++;
        }
        return thread;
    }
  ),

  // --- HELPER: Siblings for UI Arrows ---
  selectMessageSiblings: (messageId: string) => createSelector(
    selectMessagesState,
    (messages) => {
        const msg = messages.find(m => m._id === messageId);
        if (!msg) return { count: 1, index: 1, ids: [messageId] };

        // CASE 1: ROOT MESSAGE (No Parent)
        if (msg.parentMessageId === null) {
            const rootSiblings = messages
                .filter(m => m.parentMessageId === null && m.sender === msg.sender)
                .map(m => m._id);
            
            return {
                count: rootSiblings.length,
                index: rootSiblings.indexOf(messageId) + 1,
                ids: rootSiblings
            };
        }

        // CASE 2: NORMAL MESSAGE
        const parent = messages.find(p => p._id === msg.parentMessageId);
        if (!parent) return { count: 1, index: 1, ids: [messageId] };

        const siblings = parent.childrenIds;
        return {
            count: siblings.length,
            index: siblings.indexOf(messageId) + 1,
            ids: siblings
        };
    }
  ),
};