import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input"; 
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';

// Store Imports
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../../store';
// UPDATED: Import Grouped Selectors
import { ChatSelectors } from '../../../store/chat/chat.selectors';

// Components
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    LoadingSpinner
  ],
  templateUrl: './share-dialog.html',
  styleUrls: ['./share-dialog.scss']
})
export class ShareDialog {
  private readonly store = inject(Store<AppState>);
  private readonly clipboard = inject(Clipboard);
  private readonly cdRef = inject(ChangeDetectorRef);

  protected shareableLink$: Observable<string | null | undefined>;
  protected isSharing$: Observable<boolean | undefined>;
  
  isCopied = false;

  constructor() {
    // UPDATED: Use Selector Group
    this.shareableLink$ = this.store.select(ChatSelectors.selectShareUrl);
    this.isSharing$ = this.store.select(ChatSelectors.selectIsSharing);
  }

  copyLink(url: string) {
    if (!url) return;
    
    this.clipboard.copy(url);
    this.isCopied = true;
    
    // Reset icon after 2 seconds
    setTimeout(() => {
      this.isCopied = false;
      this.cdRef.markForCheck();
    }, 2000);
  }
}