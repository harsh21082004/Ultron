import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, exhaustMap, tap, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

// Services
import { AuthService } from '../../core/services/auth.service';

// Actions
import { AuthActions, AuthApiActions } from './auth.actions';
import { User } from '../../shared/models/user.model';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);    // Added

  // --- 1. SESSION INITIALIZATION ---
  initSession$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.initSession),
      exhaustMap(() => {
        const token = localStorage.getItem('token');
        
        // If no token exists, fail immediately (but silently)
        if (!token || token === 'undefined') {
          return of(AuthApiActions.initSessionFailure());
        }

        return this.authService.getUserDetails(token).pipe(
          map(userFromServer => {
            // MERGE FIX: Backend /profile usually returns user data but NOT the token.
            // We must re-attach the local token so the state remains valid for API calls.
            const user: User = {
              ...userFromServer,
              token: token 
            };
            return AuthApiActions.initSessionSuccess({ user });
          }),
          catchError(() => {
            // If token is invalid/expired, clear it
            localStorage.removeItem('token');
            return of(AuthApiActions.initSessionFailure());
          })
        );
      })
    );
  });

  // --- 2. LOGIN ---
  login$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(action =>
        this.authService.login({ email: action.email, password: action.password }).pipe(
          map(response => {
            // Login response usually contains { user: {...}, token: '...' }
            const user: User = { ...response.user, token: response.token };
            return AuthApiActions.loginSuccess({ user });
          }),
          catchError(error => of(AuthApiActions.loginFailure({ error: error.message || 'Login failed' })))
        )
      )
    );
  });

  // --- 3. SIGNUP ---
  signup$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.signup),
      exhaustMap(action =>
        this.authService.signup({ name: action.name, email: action.email, password: action.password }).pipe(
          map(response => {
            const user: User = { ...response.user, token: response.token };
            return AuthApiActions.signupSuccess({ user });
          }),
          catchError(error => of(AuthApiActions.signupFailure({ error: error.error?.message || 'Signup failed' })))
        )
      )
    );
  });

  // --- 4. OAUTH HANDLERS ---
  loginWithGoogle$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.loginWithGoogle),
      tap(() => this.authService.loginWithGoogle())
    );
  }, { dispatch: false });

  loginWithGitHub$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.loginWithGitHub),
      tap(() => this.authService.loginWithGitHub())
    );
  }, { dispatch: false });

  // --- 5. REDIRECT ON SUCCESS ---
  // Only redirect on interactive Login/Signup. 
  // NOT on InitSession (reloading page shouldn't force navigate to home).
  redirectAfterAuth$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthApiActions.loginSuccess, AuthApiActions.signupSuccess),
      tap(({ user }) => {
        localStorage.setItem('token', user.token);
        this.router.navigate(['/']);
      })
    );
  }, { dispatch: false });

  // --- 6. LOGOUT ---
  logout$ = createEffect(() => { 
    return this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        localStorage.removeItem('token');
        this.authService.logout(); // Optional if backend needs invalidation
        this.router.navigate(['/login']);
      }),
      map(() => AuthApiActions.logoutSuccess())
    );
  });

  // --- 7. PROFILE UPDATE ---
  updateProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.updateUserProfile),
      switchMap(action =>
        this.authService.updateProfile(action.data).pipe(
          map(response => {
            this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
            // Ensure response.user contains the updated fields
            return AuthApiActions.updateUserProfileSuccess({ user: response.user });
          }),
          catchError(error => {
            const msg = error.error?.message || 'Update failed';
            this.snackBar.open(msg, 'Close', { duration: 3000 });
            return of(AuthApiActions.updateUserProfileFailure({ error: msg }));
          })
        )
      )
    );
  });

  // --- 8. PREFERENCES UPDATE ---
  updatePreferences$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.updateUserPreferences),
      switchMap(action =>
        this.authService.updateUserPreferences(action.preferences).pipe(
          tap(res => console.log('Preferences update response:', res)),
          map(response => {
            this.snackBar.open('Preferences updated successfully', 'Close', { duration: 3000 });
            return AuthApiActions.updateUserPreferencesSuccess({ user: response.user });
          }),
          catchError(error => {
            const msg = error.error?.message || 'Update failed';
            this.snackBar.open(msg, 'Close', { duration: 3000 });
            return of(AuthApiActions.updateUserPreferencesFailure({ error: msg }));
          })
        )
      )
    );
  });
}