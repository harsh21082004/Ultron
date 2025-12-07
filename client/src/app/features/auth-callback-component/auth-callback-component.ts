import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../store/auth/auth.actions';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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

  private handleSuccess(token: string): void {
    try {
      localStorage.setItem('token', token);
      
      // Update UI to success state
      this.status = 'success';
      this.message = 'Login Successful! Redirecting...';
      
      // Dispatch action to load user details
      this.store.dispatch(AuthActions.initSession());

      // Show a snackbar
      this.snackbar.open('Welcome back to Ultron!', 'Dismiss', 'center', 'bottom', 'success');

      // Small delay so user sees the success state before redirecting
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1500);

    } catch (e) {
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