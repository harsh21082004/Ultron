import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChatState } from './chat.state';

export const selectChatState = createFeatureSelector<ChatState>('chat');

export const selectChatMessages = createSelector(
  selectChatState,
  (state) => state.messages
);

export const selectAllChats = createSelector(
  selectChatState,
  (state) => state.chatList
);

export const selectIsLoading = createSelector(
  selectChatState,
  (state) => state.isLoading
);

export const selectIsStreaming = createSelector(
  selectChatState,
  (state) => state.isStreaming
);

// --- TIWARI JI: NEW SELECTORS ---
export const selectSearchResults = createSelector(
  selectChatState,
  (state) => state.searchResults
);

export const selectIsSearching = createSelector(
  selectChatState,
  (state) => state.isSearching
);

export const selectChatError = createSelector(
  selectChatState,
  (state) => state.error
);

export const selectCurrentChatId = createSelector(
  selectChatState,
  (state) => state.currentChatId
)

export const selectCurrentChat = createSelector(
  selectAllChats,
  selectCurrentChatId,
  (chats, currentChatId) => {
    return chats.find(chat => chat._id === currentChatId);
  }
);

export const selectShareUrl = createSelector(
  selectChatState,
  (state) => state.shareUrl
);

export const selectShareId = createSelector(
  selectChatState,
  (state) => state.shareId
);

export const selectIsSharing = createSelector(
  selectChatState,
  (state) => state.isSharing
);

export const selectChatTitle = createSelector(
  selectChatState,
  (state)=> state.title
);

export const selectStreamStatus = createSelector(
  selectChatState,
  (state) => state.streamStatus
);