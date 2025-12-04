import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatNavList, MatListItem, MatListItemTitle, MatListItemLine } from '@angular/material/list';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Observable } from 'rxjs';
import * as ChatActions from '../../../store/chat/chat.actions';
import { selectIsSearching, selectSearchResults } from '../../../store/chat/chat.selectors';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-chat-component',
  standalone: true,
  imports: [
    CommonModule, 
    MatNavList, 
    MatListItem, 
    MatListItemTitle, 
    MatListItemLine,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  templateUrl: './search-chat.component.html',
  styleUrl: './search-chat.component.scss'
})
export class SearchChat implements OnInit {
  private _bottomSheetRef = inject<MatBottomSheetRef<SearchChat>>(MatBottomSheetRef);
  private store = inject(Store<AppState>);
  private router = inject(Router);

  searchControl = new FormControl('');
  
  // Selectors from NGRX
  searchResults$: Observable<any[]> = this.store.select(selectSearchResults);
  isSearching$: Observable<boolean> = this.store.select(selectIsSearching);

  ngOnInit() {
    // Listen to input changes
    this.searchControl.valueChanges.pipe(
      debounceTime(300),        // Wait for user to stop typing
      distinctUntilChanged()    // Ignore if value hasn't changed
    ).subscribe(query => {
      if (query && query.trim().length > 0) {
        this.store.dispatch(ChatActions.searchChats({ query }));
      } else {
        // Optional: clear results if query is empty
        this.store.dispatch(ChatActions.searchChatsSuccess({ results: [] }));
      }
    });
  }

  openChat(chatId: string, event: MouseEvent): void {
    event.preventDefault();
    this._bottomSheetRef.dismiss();
    this.router.navigate(['/chat', chatId]);
  }

  close(): void {
    this._bottomSheetRef.dismiss();
  }
}