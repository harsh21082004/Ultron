import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

// Select the auth feature state from the root state
export const selectAuthState = createFeatureSelector<AuthState>('auth');


// Select the user from the auth state
export const selectAuthUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

// Select the loading status from the auth state
export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

// Select the error from the auth state
export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectIsAuthenticated = createSelector(
  selectAuthUser,
  (user) => !!user
);

export const selectAuthToken = createSelector(
  selectAuthUser,
  (user) => user ? user.token : null
)
