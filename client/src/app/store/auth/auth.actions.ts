import { createAction, props } from '@ngrx/store';
import { User } from '../../shared/models/user.model';

// --- OAUTH ACTIONS ---
export const loginWithGoogle = createAction('[Auth] Login with Google');
export const loginWithGitHub = createAction('[Auth] Login with GitHub');

// --- SESSION INITIALIZATION ---
export const initSession = createAction('[Auth] Init Session');

export const initSessionSuccess = createAction(
  '[Auth] Init Session Success',
  props<{ user: User }>()
);

export const initSessionFailure = createAction('[Auth] Init Session Failure');


export const signup = createAction(
  '[Auth] Signup',
  props<{ name: string; email: string; password: string }>()
);

export const signupSuccess = createAction(
  '[Auth] Signup Success',
  // --- CORRECTED: This should match loginSuccess ---
  props<{ user: User }>()
);

export const signupFailure = createAction(
  '[Auth] Signup Failure',
  props<{ error: string }>()
);

export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: User }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

// --- LOGOUT ---
export const logout = createAction('[Auth] Logout');
export const logoutSuccess = createAction('[Auth] Logout Success');


// --- GET USER DETAILS (for re-hydrating session) ---
// Note: This is different from initSession. 
// This action is what 'initSession' *uses*.
export const getUserDetails = createAction(
  '[Auth] Get User Details',
  props<{ token: string }>()
);

export const getUserDetailsSuccess = createAction(
  '[Auth] Get User Details Success',
  props<{ user: User }>() 
);

export const getUserDetailsFailure = createAction(
  '[Auth] Get User Details Failure',
  props<{ error: string }>()
);
