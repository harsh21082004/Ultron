import { OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../store/auth/auth.actions';
import { Observable } from 'rxjs';
import { selectAuthError, selectIsAuthenticated, selectAuthLoading } from '../../store/auth/auth.selectors';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PinkButtonComponent } from "../../shared/components/pink-button/pink-button.component";

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, PinkButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})

export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading$: Observable<boolean>;
  error$: Observable<any>;
  isAuthenticated$: Observable<boolean>;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {
    this.isLoading$ = this.store.select(selectAuthLoading);
    this.error$ = this.store.select(selectAuthError);
    this.isAuthenticated$ = this.store.select(selectIsAuthenticated);
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.router.navigate(['/']);
      }
    });
  }

  onSubmit(): void {
    console.log("email, password")
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      console.log(email, password)
      this.store.dispatch(AuthActions.login({ email, password }));
    }
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
