import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-custom-snackbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="flex items-center gap-3 p-1">
      <!-- Dynamic Icon based on type -->
      <div class="icon-wrapper flex items-center justify-center w-8 h-8 rounded-full"
           [ngClass]="data.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'">
        <mat-icon class="!w-5 !h-5 !text-[20px] leading-none">
          {{ data.type === 'error' ? 'error_outline' : 'check_circle_outline' }}
        </mat-icon>
      </div>

      <div class="flex-1">
        <span class="text-sm font-medium text-[var(--mat-sys-on-surface)]">
          {{ data.message }}
        </span>
      </div>

      <button *ngIf="data.action" mat-button (click)="snackBarRef.dismissWithAction()" 
              class="!min-w-0 !px-3 text-pink-500 hover:text-pink-400">
        {{ data.action }}
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CustomSnackbarComponent {
  snackBarRef = inject(MatSnackBarRef);
  
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { 
    message: string, 
    action: string, 
    type: 'success' | 'error' | 'info' 
  }) {}
}