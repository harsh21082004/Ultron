import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Material Imports
import { MatNavList, MatListItem, MatListItemTitle, MatListItemLine } from '@angular/material/list';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

// Store Imports
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
// UPDATED: Import Groups & Types
import { ChatPageActions, ChatApiActions } from '../../../store/chat/chat.actions';
import { ChatSelectors } from '../../../store/chat/chat.selectors';
import { ChatSession } from '../../../store/chat/chat.state';

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
  
  // UPDATED: Selectors using the Group & Strict Typing
  searchResults$: Observable<ChatSession[] | undefined> = this.store.select(ChatSelectors.selectSearchResults);
  isSearching$: Observable<boolean | undefined> = this.store.select(ChatSelectors.selectIsSearching);

  ngOnInit() {
    // Listen to input changes
    this.searchControl.valueChanges.pipe(
      debounceTime(300),        // Wait for user to stop typing
      distinctUntilChanged()    // Ignore if value hasn't changed
    ).subscribe(query => {
      if (query && query.trim().length > 0) {
        // UPDATED: Dispatch Page Action
        this.store.dispatch(ChatPageActions.searchChats({ query }));
      } else {
        // Clear results if query is empty
        // We reuse the API Success action to reset the list to empty locally
        this.store.dispatch(ChatApiActions.searchChatsSuccess({ results: [] }));
      }
    });
  }

  openChat(chatId: string, event: MouseEvent): void {
    event.preventDefault();
    this._bottomSheetRef.dismiss();
    
    // Dispatch Enter Chat logic via Page Action (Optional, or let the Router/Component handle it)
    // this.store.dispatch(ChatPageActions.enterChat({ chatId })); 
    
    this.router.navigate(['/chat', chatId]);
  }

  close(): void {
    this._bottomSheetRef.dismiss();
  }
}