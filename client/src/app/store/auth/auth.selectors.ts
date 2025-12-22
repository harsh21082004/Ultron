import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

// Select the auth feature state
export const selectAuthState = createFeatureSelector<AuthState>('auth');

// Select User
export const selectAuthUser = createSelector(
  selectAuthState,
  (state) => state.user
);

// Select Loading
export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state.loading
);

// Select Error
export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.error
);

// Helper: Is Logged In?
export const selectIsAuthenticated = createSelector(
  selectAuthUser,
  (user) => !!user
);

// Helper: Get Token
export const selectAuthToken = createSelector(
  selectAuthUser,
  (user) => user ? user.token : null
);