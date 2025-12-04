import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, exhaustMap, tap } from 'rxjs/operators';
import * as AuthActions from './auth.actions';
import { Router } from '@angular/router';
import { User } from '../../shared/models/user.model';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  // --- OAUTH --- (No changes)
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


  // --- SESSION ---
  initSession$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.initSession),
      exhaustMap(() => {
        const token = localStorage.getItem('token');
        if (!token || token === 'undefined') { // Check for the bad token
          return of(AuthActions.initSessionFailure());
        }
        console.log("Init session")

        return this.authService.getUserDetails(token).pipe(

          // --- 1. THE FIRST FIX ---
          // 'user' from backend has no token. We must re-add it.
          map(userFromServer => {
            const user: User = {
              ...userFromServer,
              token: token // Re-attach the token we already have
            };
            return AuthActions.initSessionSuccess({ user });
          }),

          catchError(() => of(AuthActions.initSessionFailure()))
        );
      })
    );
  });

  // --- SIGNUP --- (No changes)
  signup$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.signup),
      exhaustMap(action =>
        this.authService.signup({ name: action.name, email: action.email, password: action.password }).pipe(
          map(response => {
            const user: User = { ...response.user, token: response.token };
            return AuthActions.signupSuccess({ user });
          }),
          catchError(error => of(AuthActions.signupFailure({ error: error.error?.message || 'An unknown error occurred' })))
        )
      )
    );
  });

  // --- LOGIN --- (No changes)
  login$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(action =>
        this.authService.login({ email: action.email, password: action.password }).pipe(
          tap(
            response => {
              console.log('Login response:', response);
            },
          ),
          map(response => {
            const userWithToken: User = {
              ...response.user,
              token: response.token
            };
            return AuthActions.loginSuccess({ user: userWithToken });
          }),
          catchError(error => of(AuthActions.loginFailure({ error: error.message || 'Login failed' })))
        )
      )
    );
  });

  // --- LOGOUT --- (No changes)
  logout$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        this.authService.logout();
      }),
      map(() => AuthActions.logoutSuccess())
    );
  });

  // --- REDIRECTS ---
  authSuccess$ = createEffect(() => {
    return this.actions$.pipe(

      // --- 2. THE SECOND FIX ---
      // Do NOT listen for initSessionSuccess here!
      ofType(AuthActions.loginSuccess, AuthActions.signupSuccess),

      tap(({ user }) => {
        // This now only runs on a *new* login or signup
        localStorage.setItem('token', user.token);
        this.router.navigate(['/']);
      })
    );
  }, { dispatch: false });

}