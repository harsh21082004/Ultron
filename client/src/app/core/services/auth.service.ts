import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../../shared/models/auth-response.model';
import { User } from '../../shared/models/user.model';
import { envType } from '../../shared/models/environment';
import { SnackbarService } from './snackbar.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // --- Injected Services ---
  private http = inject(HttpClient);
  private router = inject(Router);

  // Use the API URL from your environment file
  private apiUrl: string = `${(environment as envType).apiUrl}/auth`;
  private snackbar = inject(SnackbarService);

  constructor (){
    // console.log(this.apiUrl + '/login');
  }


  // --- OAuth Methods ---

  loginWithGoogle(): void {
    window.location.href = `${this.apiUrl}/google`;
  }

  loginWithGitHub(): void {
    window.location.href = `${this.apiUrl}/github`;
  }

  // --- Local Authentication ---

  /**
   * Signs up a new user.
   * Returns an AuthResponse object.
   */
  signup(credentials: { name: string, email: string, password: string }): Observable<AuthResponse> {
    // --- CORRECTED: Removed all 'tap' and 'catchError' blocks that dispatch actions ---
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, credentials);
  }

  /**
   * Logs in a user with email and password.
   * Returns an AuthResponse object.
   */
  login(credentials: { email: string, password: string }): Observable<AuthResponse> {
    // --- CORRECTED: Removed all 'tap' and 'catchError' blocks that dispatch actions ---
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  /**
   * Logs out the current user.
   * (This is a side-effect, but it's triggered by the effect, not dispatching)
   */
  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
    this.snackbar.open('Successfully logged out!', 'Dismiss', 'center', 'top', 'success');
  }

  // --- Session Re-hydration ---

  /**
   * Gets user details by sending a token.
   * Returns a full User object (with token).
   */
  getUserDetails(token: string): Observable<User> {
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // --- CORRECTED: Removed all 'tap' and 'catchError' blocks that dispatch actions ---
    return this.http.get<User>(`${this.apiUrl}/get-user-details`, { headers });
  }
}

