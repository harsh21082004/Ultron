import { Component, inject } from '@angular/core';
import { MatNavList } from '@angular/material/list';
import {
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-search-chat-component',
  imports: [MatNavList],
  templateUrl: './search-chat.component.html',
  styleUrl: './search-chat.component.scss'
})
export class SearchChat {
  private _bottomSheetRef =
    inject<MatBottomSheetRef<SearchChat>>(MatBottomSheetRef);

  openLink(event: MouseEvent): void {
    this._bottomSheetRef.dismiss();
    event.preventDefault();
  }
}
