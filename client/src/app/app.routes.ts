import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

// Import all page-level components
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { SignupComponent } from './features/signup/signup.component';
import { ProfileComponent } from './features/profile/profile.component';
import { AuthCallbackComponent } from './features/auth-callback-component/auth-callback-component';
import { ChatComponent } from './shared/components/chat/chat.component';
import { settingsDialogGuard } from './core/guards/settings.guard';

export const routes: Routes = [
  // --- Unprotected Routes ---
  { 
    path: '', 
    component: HomeComponent,
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'signup', 
    component: SignupComponent
  },
  { 
    path: 'auth/callback', 
    component: AuthCallbackComponent 
  },
  { 
    path: 'chat', 
    component: ChatComponent,
  },
  { 
    path: 'chat/:id', 
    component: ChatComponent,
  },

  // --- Protected Routes ---
  // These routes are now protected by the authGuard.
  { 
    path: 'profile', 
    component: ProfileComponent,
    canActivate: [authGuard] 
  },
  {
    path: 'settings/:category',
    canActivate: [settingsDialogGuard],
    // This component will never actually be loaded,
    // because the guard always returns false.
    // We can point it to an empty component or the main chat component.
    loadComponent: () => import('./shared/components/chat/chat.component').then(m => m.ChatComponent)
  },

  // --- Fallback ---
  // Redirects any unknown URL back to the home page
  { 
    path: '**', 
    redirectTo: '' 
  }
];

