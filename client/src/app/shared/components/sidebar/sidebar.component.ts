import { Component, computed, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationStart } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription, filter, takeUntil } from 'rxjs';

// Material
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatList, MatListItem } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheet, MatBottomSheetConfig, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

// Store & State
import { AppState } from '../../../store';
import { User } from '../../models/user.model';
import { selectAuthUser } from '../../../store/auth/auth.selectors';

// UPDATED: Chat Store Imports
import { ChatPageActions } from '../../../store/chat/chat.actions';
import { ChatSelectors } from '../../../store/chat/chat.selectors';
import { ChatSession } from '../../../store/chat/chat.state';

// Services & Components
import { DrawerService } from '../../../core/services/drawer.service';
import { ThemeService } from '../../../core/services/theme.services';
import { SettingsDialogComponent } from '../settings/settings.component';
import { SearchChat } from '../search-chat/search-chat.component';
import { AuthActions } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-sidebar-component',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    MatIcon, 
    MatIconModule, 
    MatList, 
    MatListItem, 
    MatButtonModule, 
    MatBottomSheetModule, 
    MatMenuModule
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  // Services
  private store = inject(Store<AppState>);
  private drawerService = inject(DrawerService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private dialog = inject(MatDialog);
  private _bottomSheet = inject(MatBottomSheet);

  // State
  title = () => 'AI Chat App';
  user$: Observable<User | null>;
  chats$: Observable<ChatSession[]>; // UPDATED: Typed interface
  currentChatId$: Observable<string | null>; // UPDATED: Matches state type
  
  // UI State
  isAnimatingOut = false;
  isDrawerOpen = false;
  drawerOpenUsingMenu = false;
  drawerOpenUsingHover = false;
  isMobileView = false;
  
  private destroy$ = new Subject<void>();
  private userSubscription!: Subscription;

  // Computed Signal for Theme
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');

  constructor() {
    this.user$ = this.store.select(selectAuthUser);
    
    // UPDATED: Use Selector Group
    this.chats$ = this.store.select(ChatSelectors.selectAllChats);
    this.currentChatId$ = this.store.select(ChatSelectors.selectCurrentChatId);

    // Initial check
    this.isMobileView = window.innerWidth <= 840;
  }

  ngOnInit(): void {
    // When the user logs in, fetch their chats
    this.userSubscription = this.user$.subscribe(user => {
      if (user?._id) {
        // UPDATED: Use Page Action
        console.log('Fetching chats for user:', user._id)
        this.store.dispatch(ChatPageActions.getAllChats({ userId: user._id }));
      }
    });

    // Drawer State Subscription
    this.drawerService.isOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => {
        this.isDrawerOpen = open;
        this.onDrawerStateChanged();
      });

    // Automatically close drawer when navigation starts
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.closeDrawer();
      });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.unlockBodyScroll(); // ensure scroll is restored
  }

  openSettings(): void {
    this.dialog.open(SettingsDialogComponent, {
      panelClass: 'settings-dialog-overlay',
      maxWidth: '100vw',
      maxHeight: '95vh',
      autoFocus: false
    });

    if (this.isMobile()) {
      this.closeDrawer();
    }
  }

  openBottomSheet(): void {
    const config: MatBottomSheetConfig = {
      panelClass: 'search-chat-panel',
    };
    this._bottomSheet.open(SearchChat, config);
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  // --- UI / Drawer Logic ---

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const w = (event.target as Window).innerWidth;
    const wasMobile = this.isMobileView;
    this.isMobileView = w <= 840;

    if (!this.isMobileView && wasMobile && this.isDrawerOpen) {
      this.unlockBodyScroll();
    }
  }

  isMobile(): boolean {
    return this.isMobileView;
  }

  toggleDrawer(): void {
    if (this.isMobile()) {
      this.drawerService.toggle();
      return;
    }

    // Desktop Logic
    if (this.drawerOpenUsingHover) {
      this.drawerOpenUsingHover = false;
      this.drawerOpenUsingMenu = true;
      this.drawerService.set(true);
      return;
    } else if (this.drawerOpenUsingMenu) {
      this.drawerOpenUsingMenu = false;
      this.drawerService.set(false);
      return;
    } else {
      this.drawerOpenUsingMenu = true;
      this.drawerService.set(true);
    }
  }

  closeDrawer(): void {
    // Desktop: Don't close if pinned
    if (this.drawerOpenUsingMenu && !this.isMobile()) {
      return;
    }
    this.drawerOpenUsingMenu = false;
    this.drawerOpenUsingHover = false;
    this.drawerService.set(false);
  }

  openDrawer(): void {
    if (!this.drawerService.isOpen()) {
      this.drawerOpenUsingHover = true;
      this.drawerService.set(true);
    }
  }

  private onDrawerStateChanged() {
    if (this.isMobile()) {
      if (this.isDrawerOpen) {
        this.lockBodyScroll();
      } else {
        this.unlockBodyScroll(); 
      }
    }
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('drawer-open-no-scroll');
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
    document.body.classList.remove('drawer-open-no-scroll');
  }
}