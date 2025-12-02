import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { first } from 'rxjs/operators';
import { SettingsDialogComponent } from '../../shared/components/settings/settings.component';

export const settingsDialogGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const dialog = inject(MatDialog);
  const router = inject(Router);

  // Get the category from the URL (e.g., "account", "general")
  const category = route.paramMap.get('category') || 'General';

  // Open the dialog
  const dialogRef = dialog.open(SettingsDialogComponent, {
    maxWidth: '600px',
    maxHeight: '500px',
    data: { category: category }, // Pass the category to the dialog
    backdropClass: 'blur-backdrop' // This is for the blur effect
  });

  // When the dialog closes, navigate back to the home page
  dialogRef.afterClosed().pipe(first()).subscribe(() => {
    router.navigate(['/']);
  });

  // Return false to *prevent* the router from navigating to a new page
  return false;
};