import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, Observable } from 'rxjs';
import { selectIsAuthenticated } from './store/auth/auth.selectors';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component'; 
import { LoadingService } from './core/services/loading.service';
import { ThemeService } from './core/services/theme.services';
import { AppState } from './store'; 
import { DrawerService } from './core/services/drawer.service';
import { AuthActions } from './store/auth/auth.actions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatProgressBarModule,
    SidebarComponent,
  ],
  // TIWARI JI: 
  // 1. h-[100dvh] ensures we take the EXACT viewport height (fixes mobile address bar issue).
  // 2. overflow-hidden prevents the body scrollbar.
  // 3. main has flex-1 and overflow-hidden to contain the router outlet.
  template: `
    <div class="relative flex h-[100dvh] w-full overflow-hidden">
      @if (!isLoginOrSignupPage()) {
        <app-sidebar-component></app-sidebar-component>
      }

      <!-- overlay -->
      <div *ngIf="(drawer.isOpen$ | async) && isMobileView" class="drawer-overlay" (click)="drawer.close()"></div>

      <main class="flex-1 min-w-0 h-full overflow-hidden relative">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class App implements OnInit { 
  selectIsAuthenticated$: Observable<boolean>;

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.isLoading;
  isLoginOrSignupPage = signal(false);
  isMobileView = false;
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private router: Router,
    private store: Store<AppState>,
    private themeService: ThemeService,
    public drawer: DrawerService
  ) {
    this.selectIsAuthenticated$ = this.store.select(selectIsAuthenticated);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const onAuthPage = event.urlAfterRedirects === '/login' || event.urlAfterRedirects === '/signup';
      this.isLoginOrSignupPage.set(onAuthPage);
    });

    this.isMobileView = window.innerWidth <= 639;
    window.addEventListener('resize', () => {
      this.isMobileView = window.innerWidth <= 639;
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.themeService.loadTheme();
    this.store.dispatch(AuthActions.initSession());

    this.selectIsAuthenticated$.subscribe(isAuth => {
      if (isAuth && (this.router.url === '/signup' || this.router.url === '/login')) {
        this.router.navigate(['/']);
      }
    });
  }
}