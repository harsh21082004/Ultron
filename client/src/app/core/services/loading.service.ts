import { Injectable, signal, NgZone } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _isLoading = signal(false);
  public readonly isLoading = this._isLoading.asReadonly();

  constructor(private router: Router, private zone: NgZone) {
    this.router.events.pipe(
      filter(
        (event): event is NavigationStart | NavigationEnd | NavigationCancel | NavigationError =>
          event instanceof NavigationStart ||
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        // When navigation starts, set loading to true.
        this._isLoading.set(true);
      } else {
        // When navigation finishes (for any reason), set loading to false after a short delay.
        // The delay ensures the bar is visible even for very fast navigations.
        setTimeout(() => {
          this._isLoading.set(false);
        }, 300);
      }
    });
  }
}

