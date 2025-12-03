import { Component, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from "@angular/material/menu";
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar'; // 1. Import the progress bar module
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import { RouterLink } from '@angular/router';
import { LoadingService } from '../../../core/services/loading.service';
import { ThemeService } from '../../../core/services/theme.services';
import { PinkButtonComponent } from "../pink-button/pink-button.component";
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DrawerService } from '../../../core/services/drawer.service';
import * as ChatActions from '../../../store/chat/chat.actions';
import * as AuthActions from '../../../store/auth/auth.actions';


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
  loading$: Observable<Boolean>;

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.isLoading;

  onMobileMenuToggle() {
    // if SidebarComponent is child, call an @ViewChild or use a shared service / store
    this.drawer.toggle();
  }

  handleLogout(){
    this.store.dispatch(AuthActions.logout());
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobileView();        // update on any resize (including DevTools device toggle)
  }

  private updateIsMobileView() {
    this.isMobileView = window.innerWidth <= 840;
  }

  deleteHistory(){
    this.store.dispatch(ChatActions.deleteAllChats());
  }

  // Inject the service to use it in the template
  constructor(public themeService: ThemeService, private store: Store<AppState>, private drawer: DrawerService) {
    this.user$ = this.store.select(state => state.auth.user);
    this.loading$ = this.store.select(state => state.auth.loading);
    this.isMobileView = window.innerWidth <= 840;
    console.log(window.innerWidth)
  }
  // A computed signal to easily check if the current mode is dark
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
}
