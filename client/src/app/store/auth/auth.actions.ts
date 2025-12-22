import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from '../../shared/models/user.model';

export const AuthActions = createActionGroup({
  source: 'Auth Page',
  events: {
    // Session
    'Init Session': emptyProps(),

    // Login
    'Login': props<{ email: string; password: string }>(),
    'Login With Google': emptyProps(),
    'Login With GitHub': emptyProps(),

    // Signup
    'Signup': props<{ name: string; email: string; password: string }>(),

    // Logout
    'Logout': emptyProps(),

    // Profile
    'Update User Profile': props<{ data: Partial<User> }>(),
    'Update User Preferences': props<{ preferences: any }>()
  }
});

export const AuthApiActions = createActionGroup({
  source: 'Auth API',
  events: {
    // Session Results
    'Init Session Success': props<{ user: User }>(),
    'Init Session Failure': emptyProps(),

    // Login Results
    'Login Success': props<{ user: User }>(),
    'Login Failure': props<{ error: string }>(),

    // Signup Results
    'Signup Success': props<{ user: User }>(),
    'Signup Failure': props<{ error: string }>(),

    // Logout Results
    'Logout Success': emptyProps(),

    // Profile Results
    'Update User Profile Success': props<{ user: User }>(),
    'Update User Profile Failure': props<{ error: string }>(),

    // Preferences Results
    'Update User Preferences Success': props<{ user: User }>(),
    'Update User Preferences Failure': props<{ error: string }>()
  }
});