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
