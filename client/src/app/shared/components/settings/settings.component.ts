import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.services';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import * as AuthActions from '../../../store/auth/auth.actions';



@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <!-- 
      Main container for the dialog, styled to match the dark, modal look.
      We use TailwindCSS for layout and Material components for UI.
    -->
    <div class="settings-container h-[400px] w-[600px] bg-[#1C1D21] text-white flex flex-col rounded-md overflow-hidden">
      
      <!-- Header Bar -->
      <div class="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-700">
        <h2 class="text-lg font-semibold">{{ selectedCategory() }}</h2>
        <button mat-icon-button (click)="closeDialog()" class="text-gray-400 hover:text-white">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Two-column layout -->
      <div class="flex flex-grow overflow-y-auto ">
        
        <!-- Left Navigation Pane -->
        <div class="nav-pane w-1/3 border-r border-gray-700 p-3">
          <mat-nav-list>
            @for (item of settingsMenu; track item.id) {
              <mat-list-item 
                (click)="selectedCategory.set(item.id)"
                [class.active-item]="selectedCategory() === item.id"
                class="text-xs">
                <mat-icon matListItemIcon class="mat-icon">{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.name }}</span>
              </mat-list-item>
            }
          </mat-nav-list>
        </div>

        <!-- Right Content Pane -->
        <div class="content-pane w-2/3 p-6 overflow-y-auto">
          
          <!-- Use @switch to show content based on selection -->
          @switch (selectedCategory()) {
            
            <!-- General Settings -->
            @case ('General') {
              <div class="flex flex-col gap-6">
                <div class="setting-item">
                  <label class="text-sm text-gray-400">Language</label>
                  <p class="text-xs text-gray-500 mb-2">Select the language you primarily use.</p>
                  <mat-form-field appearance="fill" class="w-full">
                    <mat-select [value]="'auto'">
                      <mat-option value="auto">Auto-detect</mat-option>
                      <mat-option value="en">English</mat-option>
                      <mat-option value="es">Spanish</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="setting-item">
                  <label class="text-sm text-gray-400">Spoken language</label>
                  <p class="text-xs text-gray-500 mb-2">For best results, select the language you mainly speak.</p>
                  <mat-form-field appearance="fill" class="w-full">
                    <mat-select [value]="'auto'">
                      <mat-option value="auto">Auto-detect</mat-option>
                      <mat-option value="en-US">English (United States)</mat-option>
                      <mat-option value="en-GB">English (United Kingdom)</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            }

            <!-- Appearance Settings -->
            @case ('Appearance') {
              <div class="flex flex-col gap-6">
                <div class="setting-item">
                  <label class="text-sm text-gray-400">Theme</label>
                  <p class="text-xs text-gray-500 mb-2">Change the application theme.</p>
                  <mat-form-field appearance="fill" class="w-full">
                    <mat-select [value]="currentTheme()" (valueChange)="toggleTheme()">
                      <mat-option value="light">Light</mat-option>
                      <mat-option value="dark">Dark</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            }

            @case ('Account') {
              <div class="flex flex-col gap-6">
                <div class="setting-item">
                  <label class="text-sm text-gray-400">Account</label>
                  <p class="text-xs text-gray-500 mb-2">Change Account Setting</p>
                  <!-- Logout -->
                  <mat-list-item 
                  (click)="logOut()"
                  class="text-xs">
                <mat-icon matListItemIcon class="mat-icon">exit_to_app</mat-icon>
                <span matListItemTitle>Logout</span>
              </mat-list-item>
                </div>
              </div>
            }

            <!-- Other categories -->
            @case ('Personalization') {
              <p>Personalization settings will go here.</p>
            }
            @case ('Data Controls') {
              <p>Data control settings will go here.</p>
            }
            @case ('Security') {
              <p>Security settings will go here.</p>
            }
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* * We use ::ng-deep to style the Angular Material components
     * to match the dark theme, as they are not children of this component's
     * encapsulated view.
    */
    
    /* Remove the default dialog padding */
    :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    /* Style for the active navigation item */
    .nav-pane .mat-mdc-list-item.active-item {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .nav-pane .mat-mdc-list-item:hover, .mat-mdc-list-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      cursor: pointer;
    }

    /* Style Material Select for dark mode */
    :host ::ng-deep .mat-mdc-form-field-type-mat-select .mat-mdc-text-field-wrapper {
      background-color: #2a2b2f !important;
      border-radius: 8px 8px 0 0;
    }

    .mat-icon{
          display: flex;
    align-items: center;
    justify-content: center;
    }

    :host ::ng-deep .mat-mdc-list-item-icon {
      font-size: 20px;
    }

     :host ::ng-deep .mdc-list-item__primary-text{
      font-size: 14px;
     }

    :host ::ng-deep .mat-mdc-select-value, 
    :host ::ng-deep .mat-mdc-select-arrow,
    :host ::ng-deep .mat-mdc-select-value-text {
      color: #fff !important;
    }
  `]
})
export class SettingsDialogComponent {
  themeService = inject(ThemeService);
  dialogRef = inject(MatDialogRef<SettingsDialogComponent>);

  // Signal to track the selected navigation item
  selectedCategory = signal('General');
  private store = inject(Store<AppState>);


  // Computed signal to get the current theme from your service
  currentTheme = computed(() => this.themeService.currentTheme());

  settingsMenu = [
    { id: 'General', name: 'General', icon: 'settings' },
    { id: 'Appearance', name: 'Appearance', icon: 'palette' },
    { id: 'Personalization', name: 'Personalization', icon: 'tune' },
    { id: 'Data Controls', name: 'Data Controls', icon: 'database' },
    { id: 'Security', name: 'Security', icon: 'security' },
    { id: 'Help', name: 'Help', icon: 'help' },
    { id: 'Account', name: 'Account', icon: 'person' }
  ];

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  logOut(): void {
    this.store.dispatch(AuthActions.logout());
    this.closeDialog();
  }
}