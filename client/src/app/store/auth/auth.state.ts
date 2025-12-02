import { User } from "../../shared/models/user.model";

export interface AuthState {
  user: User | null;      // Holds the authenticated user object, or null if not logged in.
  loading: boolean;       // True when an async operation (like login) is in progress.
  error: string | null;   // Holds any error message from the latest operation.
}

/**
 * The initial state for the authentication feature slice.
 * This is the state of the application when it first loads.
 */
export const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
};
