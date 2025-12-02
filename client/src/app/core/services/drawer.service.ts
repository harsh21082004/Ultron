import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DrawerService {
  // single source of truth
  private _isOpen = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen.asObservable();

  isOpen(): boolean {
    return this._isOpen.getValue();
  }

  open(): void {
    this._isOpen.next(true);
  }

  close(): void {
    this._isOpen.next(false);
  }

  toggle(): void {
    this._isOpen.next(!this._isOpen.getValue());
  }

  set(value: boolean): void {
    this._isOpen.next(value);
  }
}
