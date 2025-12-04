import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationStart } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, Subscription, filter, takeUntil } from 'rxjs';
import { AppState } from '../../../store';
import { User } from '../../models/user.model';
import * as AuthActions from '../../../store/auth/auth.actions';
import { selectAuthUser } from '../../../store/auth/auth.selectors';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatList, MatListItem } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheet, MatBottomSheetConfig, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { SearchChat } from '../search-chat/search-chat.component';
import { MatMenuModule } from '@angular/material/menu';
import * as ChatActions from '../../../store/chat/chat.actions';
import { selectAllChats } from '../../../store/chat/chat.selectors';
import { DrawerService } from '../../../core/services/drawer.service';
import { SettingsDialogComponent } from '../settings/settings.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-sidebar-component',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, MatIcon, MatIconModule, MatList, MatListItem, MatButtonModule, MatBottomSheetModule, MatMenuModule],
})
export class SidebarComponent implements OnInit, OnDestroy {
  title = () => 'AI Chat App';
  user$: Observable<User | null>;
  chats$: Observable<any[]>;
  isAnimatingOut = false;
  private destroy$ = new Subject<void>();

  isDrawerOpen = false;
  drawerOpenUsingMenu = false;
  drawerOpenUsingHover = false;
  isMobileView = false;

  private userSubscription!: Subscription;
  private dialog = inject(MatDialog);

  constructor(
    private store: Store<AppState>,
    private drawerService: DrawerService,
    private router: Router // TIWARI JI: Injected Router here
  ) {
    this.user$ = this.store.select(selectAuthUser);
    this.chats$ = this.store.select(selectAllChats);
    this.isMobileView = window.innerWidth <= 840;
  }

  openSettings(): void {
    this.dialog.open(SettingsDialogComponent, {
      panelClass: 'settings-dialog-overlay', // Critical for CSS styling
      maxWidth: '100vw',
      maxHeight: '95vh',
      autoFocus: false
    });

    // If on mobile, close the drawer so user sees the dialog clearly
    if (this.isMobile()) {
      this.closeDrawer();
    }
  }

  // listen to resize so the component can adapt
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
      // On mobile, just toggle the service
      this.drawerService.toggle();
      return;
    }

    // --- Desktop Logic ---
    if (this.drawerOpenUsingHover) {
      // Case 1: Drawer was open by hover, user clicks menu to "pin" it.
      this.drawerOpenUsingHover = false;
      this.drawerOpenUsingMenu = true;
      // We don't need to call the service, it's already open.
      // But we call set(true) to be safe.
      this.drawerService.set(true);
      return;
    } else if (this.drawerOpenUsingMenu) {
      // Case 2: Drawer was "pinned", user clicks menu to "unpin" and close it.
      this.drawerOpenUsingMenu = false;
      this.drawerService.set(false); // Tell the service to close
      return;
    } else {
      // Case 3: Drawer is closed, user clicks menu to open and pin it.
      this.drawerOpenUsingMenu = true;
      this.drawerService.set(true); // Tell the service to open
    }
  }

  closeDrawer(): void {
    // Desktop logic: Don't close if it's "pinned" by the menu.
    if (this.drawerOpenUsingMenu && !this.isMobile()) {
      return;
    }

    // On mobile, or if not pinned, reset all flags and close.
    this.drawerOpenUsingMenu = false;
    this.drawerOpenUsingHover = false;
    this.drawerService.set(false); // Tell the service to close
  }

  openDrawer(): void {
    // Use the service as the source of truth, not the local property
    if (!this.drawerService.isOpen()) {
      this.drawerOpenUsingHover = true;
      this.drawerService.set(true); // Tell the service to open
    }
  }

  // Called whenever the drawer state changes (used to lock/unlock body on mobile)
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

  ngOnInit(): void {
    // When the user logs in, fetch their chats
    this.userSubscription = this.user$.subscribe(user => {
      if (user?._id) {
        this.store.dispatch(ChatActions.getAllChats({ userId: user._id }));
      }
    });

    // --- THIS IS NOW THE ONLY SOURCE OF TRUTH ---
    this.drawerService.isOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => {
        // 1. Update the local property
        this.isDrawerOpen = open;
        // 2. Run side effects (like scroll lock)
        this.onDrawerStateChanged();
      });

    // TIWARI JI: Automatically close drawer when navigation starts
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

  private _bottomSheet = inject(MatBottomSheet);

  openBottomSheet(): void {
    const config: MatBottomSheetConfig = {
      panelClass: 'search-chat-panel', // Apply a single class
      // or panelClass: ['class1', 'class2'], // Apply multiple classes
    };
    this._bottomSheet.open(SearchChat, config);
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}