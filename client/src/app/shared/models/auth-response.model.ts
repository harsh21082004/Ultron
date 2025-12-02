import { User } from './user.model';

/**
 * Defines the expected shape of the response from your backend's
 * login or registration endpoints.
 * The 'user' object here is the raw DB object, without the token.
 */
export interface AuthResponse {
  user: Omit<User, 'token'>; // The user object (without token)
  token: string;             // The token as a separate property
}
