import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChatState } from './chat.state';

const selectChatState = createFeatureSelector<ChatState>('chat'); 

// Private selectors (internal building blocks)
const selectMessagesState = createSelector(selectChatState, (state) => state.messages);
const selectAllChatsState = createSelector(selectChatState, (state) => state.chatList);
const selectCurrentChatIdState = createSelector(selectChatState, (state) => state.currentChatId);

// Exported Group
export const ChatSelectors = {
  selectChatState,
  
  // Data
  selectMessages: selectMessagesState,
  selectAllChats: selectAllChatsState,
  selectCurrentChatId: selectCurrentChatIdState,
   
  selectCurrentChat: createSelector(
    selectAllChatsState,
    selectCurrentChatIdState,
    (chats, currentChatId) => chats.find(chat => chat._id === currentChatId)
  ),
  
  selectChatTitle: createSelector(selectChatState, (state) => state.title),
  selectStreamStatus: createSelector(selectChatState, (state) => state.streamStatus),

  // UI Flags
  selectIsLoading: createSelector(selectChatState, (state) => state.isLoading),
  selectIsStreaming: createSelector(selectChatState, (state) => state.isStreaming),
  selectChatError: createSelector(selectChatState, (state) => state.error),
  
  // Search
  selectSearchResults: createSelector(selectChatState, (state) => state.searchResults),
  selectIsSearching: createSelector(selectChatState, (state) => state.isSearching),
  
  // Share
  selectShareUrl: createSelector(selectChatState, (state) => state.shareUrl),
  selectShareId: createSelector(selectChatState, (state) => state.shareId),
  selectIsSharing: createSelector(selectChatState, (state) => state.isSharing),
};