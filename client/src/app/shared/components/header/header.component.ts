import { Component, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from "@angular/material/menu";
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar'; // 1. Import the progress bar module
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule
import { Observable, Subscription, withLatestFrom } from 'rxjs';
import { User } from '../../models/user.model';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingService } from '../../../core/services/loading.service';
import { ThemeService } from '../../../core/services/theme.services';
import { PinkButtonComponent } from "../pink-button/pink-button.component";
import { DrawerService } from '../../../core/services/drawer.service';
import * as AuthActions from '../../../store/auth/auth.actions';
import * as ChatActions from '../../../store/chat/chat.actions';
import { selectCurrentChat, selectCurrentChatId, selectChatTitle, selectShareId } from '../../../store/chat/chat.selectors';
import { MatDialog } from '@angular/material/dialog';
import { ShareDialog } from '../share-dialog/share-dialog';


@Component({
  selector: 'app-header-component',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatButtonModule,
    MatProgressBarModule, // 2. Add the module to the imports array
    MatIconModule,
    RouterLink,
    PinkButtonComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  
})
export class HeaderComponent {
  light_mode = 'light_mode';
  dark_mode = 'bedtime';
  isMobileView = false;

  user$: Observable<User | null>;
  loading$: Observable<boolean>;
  currentChat$: Observable<any | null>;

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.isLoading;

  private route = inject(ActivatedRoute);
  private routeSub!: Subscription;
  public isSharedChatView = false;
  public title$: Observable<string | null | undefined>;
  public shareId$: Observable<string | null | undefined>;


  shareDialog = inject(MatDialog);

  onMobileMenuToggle() {
    // if SidebarComponent is child, call an @ViewChild or use a shared service / store
    this.drawer.toggle();
  }

  handleShare(chatId: string): void {
    this.shareDialog.open(ShareDialog , {
      panelClass: 'share-dialog',
      width: '600px',
      data: { chatId }
    })
    this.store.dispatch(ChatActions.shareChat({ chatId }));
  }

  handleLogout(){
    this.store.dispatch(AuthActions.logout());
  }

  handleSaveConversation(): void {
    // We subscribe once to get the current value, then dispatch
    // The previous implementation had a lingering subscription in the method body which is bad practice
    let sub = this.shareId$.subscribe(shareId => { 
      if (shareId) {
        this.store.dispatch(ChatActions.saveSharedConversation({ shareId }));
      }
    });
    // Unsubscribe immediately as we only needed the value once for the action
    setTimeout(() => sub.unsubscribe(), 0); 
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobileView();        // update on any resize (including DevTools device toggle)
  }

  private updateIsMobileView() {
    this.isMobileView = window.innerWidth <= 840;
  }

  ngOnInit(): void {
      this.routeSub = this.route.paramMap.pipe(
        withLatestFrom(this.store.select(selectCurrentChatId))
      ).subscribe(([params, currentLoadedChatId]) => {
        const urlChatId = params.get('id');
        const shareId = params.get('shareId'); 
  
        // 1. Shared Chat Route (High Priority)
        if (shareId) {
          this.isSharedChatView = true;
          // Dispatch specific action to load shared chat content
          this.store.dispatch(ChatActions.loadSharedChat({ shareId }));
        } 
        // 2. Normal Chat Route (Loading existing history)
        else if (urlChatId) {
          this.isSharedChatView = false;
          // Only load if it's different from what's currently in memory
          if (urlChatId !== currentLoadedChatId) {
            this.store.dispatch(ChatActions.loadChatHistory({ chatId: urlChatId }));
          }
        } 
        // 3. New Chat / Root
        else {
          this.isSharedChatView = false;
          // FIX: Always clear the chat when hitting the root route. 
          // This handles cases where we come from a Shared Chat (where currentLoadedChatId might be null or different)
          // and ensures the view is reset to empty.
          this.store.dispatch(ChatActions.clearActiveChat());
        }
      });
    }

  // Inject the service to use it in the template
  constructor(public themeService: ThemeService, private store: Store<AppState>, private drawer: DrawerService) {
    this.user$ = this.store.select(state => state.auth.user);
    this.loading$ = this.store.select(state => state.auth.loading);
    this.currentChat$ = this.store.select(selectCurrentChat);
    this.title$ = this.store.select(selectChatTitle);
    this.shareId$ = this.store.select(selectShareId);
    this.isMobileView = window.innerWidth <= 840;
  }
  // A computed signal to easily check if the current mode is dark
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
}
