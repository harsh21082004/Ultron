import { createReducer, on } from '@ngrx/store';
import { AuthActions, AuthApiActions } from './auth.actions';
import { initialAuthState } from './auth.state';

export const authReducer = createReducer(
  initialAuthState,

  // --- TRIGGER ACTIONS (Set Loading) ---
  on(
    AuthActions.initSession,
    AuthActions.login,
    AuthActions.signup,
    AuthActions.loginWithGoogle,
    AuthActions.loginWithGitHub,
    AuthActions.updateUserProfile,
    (state) => ({
      ...state,
      loading: true,
      error: null
    })
  ),

  // --- SUCCESS ACTIONS ---
  on(
    AuthApiActions.loginSuccess,
    AuthApiActions.signupSuccess,
    AuthApiActions.initSessionSuccess,
    (state, { user }) => ({
      ...state,
      user: user,
      loading: false,
      error: null
    })
  ),

  on(AuthApiActions.updateUserProfileSuccess, (state, { user }) => ({
    ...state,
    // Merge new profile data with existing user state (keeping token if not returned)
    user: state.user ? { ...state.user, ...user } : user,
    loading: false,
    error: null
  })),

  // --- FAILURE ACTIONS ---
  on(
    AuthApiActions.loginFailure,
    AuthApiActions.signupFailure,
    AuthApiActions.updateUserProfileFailure,
    (state, { error }) => ({
      ...state,
      loading: false,
      error: error
    })
  ),

  on(AuthApiActions.initSessionFailure, (state) => ({
    ...state,
    user: null,
    loading: false,
    error: null
  })),

  // --- LOGOUT ---
  on(AuthActions.logout, (state) => ({
    ...state,
    loading: true
  })),

  on(AuthApiActions.logoutSuccess, () => ({
    ...initialAuthState // Reset to clean state
  }))
);