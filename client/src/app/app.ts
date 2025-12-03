import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from './store/auth/auth.actions';
import { filter, Observable } from 'rxjs';
import { selectIsAuthenticated } from './store/auth/auth.selectors';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component'; // Assuming sidebar.component.ts
import { LoadingService } from './core/services/loading.service';
import { ThemeService } from './core/services/theme.services';
import { AppState } from './store'; // Assuming /store/index.ts
import { DrawerService } from './core/services/drawer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatProgressBarModule,
    SidebarComponent,
  ],
  template: `
    <div class="relative flex">
  @if (!isLoginOrSignupPage()) {
    <app-sidebar-component></app-sidebar-component>
  }

  <!-- overlay: use DrawerService observable and mobile check -->
  <div *ngIf="(drawer.isOpen$ | async) && isMobileView" class="drawer-overlay" (click)="drawer.close()"></div>

  <main class="min-w-0">
    <router-outlet></router-outlet>
  </main>
</div>

  `,
})
export class App implements OnInit { // <-- Renamed from 'App' to 'AppComponent'
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
    // add a resize listener (or HostListener) if you prefer:
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
