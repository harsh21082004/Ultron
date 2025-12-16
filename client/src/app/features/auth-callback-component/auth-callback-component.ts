import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom, filter, take, timer, forkJoin, race, of, map } from 'rxjs';

import * as AuthActions from '../../store/auth/auth.actions';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-auth-callback-component',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './auth-callback-component.html',
  styleUrls: ['./auth-callback-component.scss']
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private store = inject(Store);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  status: 'loading' | 'success' | 'error' = 'loading';
  message = 'Finalizing your secure login...';

  ngOnInit(): void {
    // 1. Get the token from the URL
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      // 2. Success Case
      this.handleSuccess(token);
    } else {
      // 3. Error Case
      this.handleError();
    }
  }

  private async handleSuccess(token: string): Promise<void> {
    try {
      localStorage.setItem('token', token);
      
      // Update UI to success state
      this.status = 'success';
      this.message = 'Login Successful! Redirecting...';
      
      // Dispatch action to load user details
      this.store.dispatch(AuthActions.initSession());

      this.snackbar.open('Welcome back to Ultron!', 'Dismiss', 'center', 'bottom', 'success');

      // CRITICAL FIX: Wait for Visual Delay AND User Data simultaneously.
      // We wait for the user to populate in the store before navigating.
      // We also add a safety timeout (race) so we don't hang forever if the API fails silently.
      
      await firstValueFrom(
        forkJoin([
          // 1. Mandatory Animation Delay (1.5s)
          timer(1500),
          
          // 2. Wait for User Data (with 5s safety timeout)
          race(
            this.store.select(selectAuthUser).pipe(
              filter(user => !!user), // Wait until user is not null
              take(1)
            ),
            timer(5000).pipe(map(() => true)) // Fallback if data takes too long
          )
        ])
      );

      // Now we navigate, knowing data is ready (or we timed out trying)
      this.router.navigate(['/']);

    } catch (e) {
      console.error('Callback handling error:', e);
      this.handleError();
    }
  }

  private handleError(): void {
    this.status = 'error';
    this.message = 'Authentication failed. Please try again.';
    this.snackbar.open('Login failed. No token received.', 'Retry', 'center', 'bottom', 'error');
  }

  retryLogin(): void {
    this.router.navigate(['/login']);
  }
}