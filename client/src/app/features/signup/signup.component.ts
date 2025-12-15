import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '../../store';
import { selectAuthError, selectAuthLoading } from '../../store/auth/auth.selectors';
import * as AuthActions from '../../store/auth/auth.actions';
import { AsyncPipe, CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PinkButtonComponent } from "../../shared/components/pink-button/pink-button.component";
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-signup-component',
  imports: [ReactiveFormsModule, AsyncPipe, CommonModule, RouterLink, PinkButtonComponent, MatIconModule, MatButtonModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupForm: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  private location = inject(Location);

  constructor(private store: Store<AppState>, private fb: FormBuilder) {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.loading$ = this.store.select(selectAuthLoading);
    this.error$ = this.store.select(selectAuthError);
  }

  goBack(): void {
    this.location.back();
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.signupForm.value;
    this.store.dispatch(AuthActions.signup({ name, email, password }));
  }

  /**
   * Dispatches the action to initiate the Google OAuth flow.
   */
  onGoogleLogin(): void {
    this.store.dispatch(AuthActions.loginWithGoogle());
  }

  /**
   * Dispatches the action to initiate the GitHub OAuth flow.
   */
  onGitHubLogin(): void {
    this.store.dispatch(AuthActions.loginWithGitHub());
  }
}

