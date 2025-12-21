import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input"; // CRITICAL IMPORT
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../../store';
import { selectIsSharing, selectShareUrl } from '../../../store/chat/chat.selectors'; // Ensure path is correct
import { Clipboard } from '@angular/cdk/clipboard';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

@Component({
  selector: 'app-share-dialog',
  standalone: true, // Assuming standalone
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
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
    this.shareableLink$ = this.store.select(selectShareUrl);
    this.isSharing$ = this.store.select(selectIsSharing);
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