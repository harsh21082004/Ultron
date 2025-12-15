import { ApplicationConfig, importProvidersFrom, isDevMode, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { reducers } from './store'; // 1. Use the reducers map from index.ts
import { AuthEffects } from './store/auth/auth.effects';
import { ChatEffects } from './store/chat/chat.effects';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { tokenInterceptor } from './core/interceptor/token.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([tokenInterceptor])
    ),
    
    // 2. Provide the root store using your 'reducers' map
    provideStore(reducers),
    
    // 3. Provide all effects
    provideEffects([AuthEffects, ChatEffects]),

    // 4. Provide the router store for accessing URL params in effects
    provideRouterStore(),
    
    // 5. Provide the DevTools for easier debugging
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),

    // 6. Provide the Monaco Editor Module
    importProvidersFrom(MonacoEditorModule.forRoot()),

    // 7. Add animation
    provideAnimationsAsync(), 
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  ],
};

