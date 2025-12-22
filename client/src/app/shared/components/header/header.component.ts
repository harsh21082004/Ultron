import { Component, computed, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, firstValueFrom, take } from 'rxjs';

// Material Imports
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from "@angular/material/menu";
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

// Store Imports
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import { User } from '../../models/user.model';

// Selectors & Actions (The New Groups)
import { selectAuthUser, selectAuthLoading } from '../../../store/auth/auth.selectors';
import { ChatPageActions } from '../../../store/chat/chat.actions';
import { ChatSelectors } from '../../../store/chat/chat.selectors';
import { ChatSession } from '../../../store/chat/chat.state'; // Updated Type

// Services & Components
import { LoadingService } from '../../../core/services/loading.service';
import { ThemeService } from '../../../core/services/theme.services';
import { DrawerService } from '../../../core/services/drawer.service';
import { PinkButtonComponent } from "../pink-button/pink-button.component";
import { ShareDialog } from '../share-dialog/share-dialog';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { AuthActions } from '../../../store/auth/auth.actions';

@Component({
  selector: 'app-header-component',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    RouterLink,
    PinkButtonComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  // Services
  private store = inject(Store<AppState>);
  private drawerService = inject(DrawerService);
  private dialog = inject(MatDialog);
  private loadingService = inject(LoadingService);
  public themeService = inject(ThemeService); // Public for template access

  // State Observables
  user$: Observable<User | null>;
  loading$: Observable<boolean>;
  currentChat$: Observable<ChatSession | undefined>; // Updated type from 'any'
  title$: Observable<string | null | undefined>;
  shareId$: Observable<string | null | undefined>;

  // UI State
  light_mode = 'light_mode';
  dark_mode = 'bedtime';
  isMobileView = false;
  isSharedChatView = false; // This can be derived from shareId$ existence

  // Global Loading Spinner (Service-based)
  isLoading = this.loadingService.isLoading;

  // Computed Signal for Theme
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');

  constructor() {
    // Initialize Observables
    this.user$ = this.store.select(selectAuthUser);
    this.loading$ = this.store.select(selectAuthLoading); // Used proper selector

    // Use new ChatSelectors Group
    this.currentChat$ = this.store.select(ChatSelectors.selectCurrentChat);
    this.title$ = this.store.select(ChatSelectors.selectChatTitle);
    this.shareId$ = this.store.select(ChatSelectors.selectShareId);

    // Initial check
    this.updateIsMobileView();
  }

  ngOnInit(): void {
    // Note: I removed the Route Subscription here. 
    // The ChatComponent (Page) is responsible for reading the URL 
    // and dispatching 'enterChat' or 'loadSharedChat'.
    // The Header simply reflects the resulting Store state.

    // Subscribe to shareId solely to toggle the view flag
    this.shareId$.subscribe(id => {
      this.isSharedChatView = !!id;
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobileView();
  }

  private updateIsMobileView() {
    this.isMobileView = window.innerWidth <= 840;
  }

  onMobileMenuToggle() {
    this.drawerService.toggle();
  }

  handleLogout() {
    this.store.dispatch(AuthActions.logout());
  }

  handleShare(chatId: string): void {
    // 1. Open Dialog & Capture Ref
    const dialogRef = this.dialog.open(ShareDialog, {
      panelClass: 'share-dialog',
      width: '600px',
      data: { chatId }
    });

    // 2. Dispatch Action to Generate Link
    this.store.dispatch(ChatPageActions.shareChat({ chatId }));

    // 3. Reset State on Close
    dialogRef.afterClosed().subscribe(() => {
      this.store.dispatch(ChatPageActions.clearShareState());
    });
  }

  handleSaveAsConversation(): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      panelClass: 'save-dialog',
      width: '400px',
      // You can pass data here if you want dynamic text in the dialog
      data: { title: 'Import Chat', message: 'Do you want to save this conversation?' } 
    });

    // FIX: Subscribe to the result
    dialogRef.afterClosed().subscribe(result => {
      // If the user clicked the button with [mat-dialog-close]="true"
      if (result === true) {
        this.handleSaveConversation();
      }
    });
  }

  async handleSaveConversation(): Promise<void> {
    const shareId = await firstValueFrom(this.shareId$.pipe(take(1)));

    if (shareId) {
      this.store.dispatch(ChatPageActions.saveSharedConversation({ shareId }));
    }
  }
}