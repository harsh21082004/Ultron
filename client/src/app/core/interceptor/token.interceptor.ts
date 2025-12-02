import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { switchMap, take } from 'rxjs/operators';
import { AppState } from '../../store';
import { selectAuthToken } from '../../store/auth/auth.selectors';
import { environment } from '../../../environments/environment';

/**
 * A functional HTTP interceptor that attaches the JWT token
 * to outgoing requests destined for our API.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store<AppState>);
  
  // Only intercept requests going to our own API
  if (!req.url.startsWith(environment.apiUrl) && !req.url.startsWith(environment.fastApiUrl)) {
    return next(req); // Not our API, skip
  }

  // Get the token from the store
  return store.select(selectAuthToken).pipe(
    take(1), // Get the current token
    switchMap(token => {
      if (!token) {
        return next(req); // No token, proceed without changes
      }

      // Clone the request and add the Authorization header
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next(authReq); // Send the modified request
    })
  );
};
