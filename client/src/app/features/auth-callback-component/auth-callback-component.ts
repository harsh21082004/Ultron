import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../store/auth/auth.actions';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-callback-component',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-black text-white">
      <div class="flex items-center gap-4">
        <!-- Loading Spinner SVG -->
        <svg class="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-lg">Finalizing your login, please wait...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Get the token from the URL's query parameters.
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      // 2. If a token exists, save it to localStorage immediately.
      localStorage.setItem('token', token);

      // 3. Dispatch the action to initialize the session.
      //    Your existing initSession$ effect will now take over. It will use the
      //    token we just saved to fetch user details and log them in.
      this.store.dispatch(AuthActions.initSession());

    } else {
      // If for some reason there's no token, something went wrong.
      // Send the user back to the login page with an error.
      // (This part can be enhanced with a proper error message in the store).
      console.error("Auth Callback: No token found in URL.");
      this.router.navigate(['/login']);
    }
  }
}

