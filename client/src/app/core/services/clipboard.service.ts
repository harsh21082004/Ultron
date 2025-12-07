import { Injectable, inject } from '@angular/core';
import { SnackbarService } from './snackbar.service';

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {
  private snackbar = inject(SnackbarService);

  async copyText(text: string): Promise<void> {
    if (!text) return;

    try {
      // Modern API
      await navigator.clipboard.writeText(text);
      this.snackbar.open('Copied to clipboard', 'Done', 'center', 'bottom', 'success');
    } catch (err) {
      // Fallback for older browsers or restricted contexts
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Ensure it's not visible
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.snackbar.open('Copied to clipboard', 'Done', 'center', 'bottom', 'success');
    } catch (err) {
      console.error('Fallback copy failed', err);
      this.snackbar.open('Failed to copy', 'Retry', 'center', 'bottom', 'error');
    }

    document.body.removeChild(textArea);
  }
}