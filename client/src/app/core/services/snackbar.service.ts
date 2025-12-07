import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { CustomSnackbarComponent } from '../../shared/components/custom-snackbar/custom-snackbar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private _snackBar = inject(MatSnackBar);

  /**
   * Opens a custom snackbar.
   * @param message The text to display.
   * @param action The label for the action button (optional).
   * @param hPosition 'start' | 'center' | 'end' | 'left' | 'right'
   * @param vPosition 'top' | 'bottom'
   * @param type 'success' | 'error' | 'info'
   */
  open(
    message: string, 
    action: string = 'Close', 
    hPosition: MatSnackBarHorizontalPosition = 'center', 
    vPosition: MatSnackBarVerticalPosition = 'bottom',
    type: 'success' | 'error' | 'info' = 'success'
  ) {
    this._snackBar.openFromComponent(CustomSnackbarComponent, {
      data: { message, action, type },
      horizontalPosition: hPosition,
      verticalPosition: vPosition,
      duration: 3000,
      // TIWARI JI: This class allows us to style the container in styles.scss
      panelClass: ['glass-snackbar', type] 
    });
  }
}