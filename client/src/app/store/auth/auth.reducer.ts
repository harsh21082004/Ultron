import { createReducer, on } from '@ngrx/store';
import * as AuthActions from './auth.actions';
import { AuthState, initialAuthState } from './auth.state';

export const authReducer = createReducer(
  initialAuthState, // Use the imported initial state

  // --- LOADING/FAILURE HANDLERS ---

  // Set loading true for all starting actions
  on(
    AuthActions.initSession, 
    AuthActions.signup, 
    AuthActions.login, 
    AuthActions.loginWithGoogle, 
    AuthActions.loginWithGitHub,
    (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  // Handle all failures
  on(
    AuthActions.signupFailure, 
    AuthActions.loginFailure, 
    (state, { error }) => ({
    ...state,
    user: null,
    loading: false,
    error,
  })),

  // Handle session init failure (resets to initial state)
  on(AuthActions.initSessionFailure, (state) => ({
    ...initialAuthState
  })),

  // --- SUCCESS HANDLERS ---

  // All successful auth actions land here
  on(
    AuthActions.initSessionSuccess, 
    AuthActions.signupSuccess, 
    AuthActions.loginSuccess, 
    (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null,
  })),

  // --- LOGOUT ---
  on(AuthActions.logout, (state) => ({
    ...state,
    loading: true, // Set loading true while logout happens
  })),
  
  on(AuthActions.logoutSuccess, (state) => ({
    ...initialAuthState, // Reset to initial state on logout success
  })),

  // Your getUserDetails actions are implicitly handled by the
  // 'initSession' handlers if you re-use them, or you can add:
  on(AuthActions.getUserDetails, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AuthActions.getUserDetailsSuccess, (state, { user }) => ({
    ...state,
    user: user,
    loading: false,
    error: null,
  })),
  on(AuthActions.getUserDetailsFailure, (state, { error }) => ({
    ...state,
    loading: false, // Don't log out, just set error
    error,
  }))
);
