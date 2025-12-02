import { ActionReducerMap } from '@ngrx/store';
import { routerReducer, RouterReducerState } from '@ngrx/router-store'; // 1. Import these

import { AuthState } from './auth/auth.state';
import { authReducer } from './auth/auth.reducer';
import { ChatState } from './chat/chat.state';
import { chatReducer } from './chat/chat.reducer';

export interface AppState {
  auth: AuthState;
  chat: ChatState;
  router: RouterReducerState; // 2. Add the router state
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  chat: chatReducer,
  router: routerReducer, // 3. Register the router reducer
};

