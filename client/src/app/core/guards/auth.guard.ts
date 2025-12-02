import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { AppState } from '../../store';
import { selectIsAuthenticated } from '../../store/auth/auth.selectors';

/**
 * A functional route guard that checks if the user is authenticated.
 * If not, it redirects them to the /login page.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store<AppState>);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1), // Take the current value and complete
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true; // User is authenticated, allow access
      }

      // User is not authenticated, redirect to login
      router.navigate(['/login']);
      return false;
    })
  );
};
