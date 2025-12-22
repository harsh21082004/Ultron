import { User } from "../../shared/models/user.model";

export interface AuthState {
  user: User | null;      // The authenticated user (including token)
  loading: boolean;       // Async operation in progress
  error: string | null;   // Error messages
}

export const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
};