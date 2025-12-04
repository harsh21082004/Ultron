import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatSlideToggleModule,
    MatTooltipModule
  ],
  template: `
    <!-- 
      TIWARI JI: 
      1. bg-[var(--mat-menu-container-color)]: Uses your global theme background (Light/Dark).
      2. text-[var(--mat-sys-on-surface)]: Uses your global text color.
    -->
    <div class="settings-container bg-[var(--mat-menu-container-color)] text-[var(--mat-sys-on-surface)] flex flex-col overflow-hidden h-full w-full">
      
      <!-- Header Bar -->
      <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
        <h2 class="text-lg font-semibold tracking-wide">{{ selectedCategory() }}</h2>
        <button mat-icon-button (click)="closeDialog()" class="text-[var(--mat-sys-on-surface)] opacity-60 hover:opacity-100 transition-opacity">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Two-column layout -->
      <div class="flex flex-grow overflow-hidden">
        
        <!-- Left Navigation Pane -->
        <div class="nav-pane border-r border-black/10 dark:border-white/10 p-2 overflow-y-auto custom-scrollbar transition-all duration-300"
             [ngClass]="isMobileView ? 'w-[60px] items-center flex flex-col' : 'w-1/3'">
          <mat-nav-list class="w-full">
            @for (item of settingsMenu; track item.id) {
              <mat-list-item 
                (click)="selectedCategory.set(item.id)"
                [class.active-item]="selectedCategory() === item.id"
                class="mb-1 transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                [ngClass]="isMobileView ? 'rounded-full w-10 h-10 mx-auto justify-center px-0' : 'rounded-full'"
                [matTooltip]="isMobileView ? item.name : ''"
                [class.mat-list-mobile]="isMobileView"
                [matTooltipPosition]="'right'">
                
                <mat-icon matListItemIcon class="mat-icon text-[var(--mat-sys-on-surface)] opacity-70" 
                          [class.text-pink-500]="selectedCategory() === item.id"
                          [class.opacity-100]="selectedCategory() === item.id"
                          [class.mat-icon-mobile]="isMobileView">
                  {{ item.icon }}
                </mat-icon>
                
                @if (!isMobileView) {
                  <span matListItemTitle class="text-sm font-medium ml-2">{{ item.name }}</span>
                }
              </mat-list-item>
            }
          </mat-nav-list>
        </div>

        <!-- Right Content Pane -->
        <div class="content-pane p-4 sm:p-6 overflow-y-auto custom-scrollbar"
             [ngClass]="isMobileView ? 'w-[calc(100%-60px)]' : 'w-2/3'">
          
          <div class="fade-in">
            @switch (selectedCategory()) {
              
              @case ('General') {
                <div class="flex flex-col gap-6">
                  <div class="setting-item">
                    <label class="block text-sm font-medium opacity-80 mb-1">Language</label>
                    <p class="text-xs opacity-50 mb-3">Select the language you primarily use.</p>
                    <mat-form-field appearance="outline" class="w-full density-compact">
                      <mat-select [value]="'auto'">
                        <mat-option value="auto">Auto-detect</mat-option>
                        <mat-option value="en">English</mat-option>
                        <mat-option value="es">Spanish</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <div class="setting-item">
                    <label class="block text-sm font-medium opacity-80 mb-1">Spoken Language</label>
                    <p class="text-xs opacity-50 mb-3">For best results, select the language you mainly speak.</p>
                    <mat-form-field appearance="outline" class="w-full density-compact">
                      <mat-select [value]="'auto'">
                        <mat-option value="auto">Auto-detect</mat-option>
                        <mat-option value="en-US">English (US)</mat-option>
                        <mat-option value="en-GB">English (UK)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>
              }

              @case ('Appearance') {
                <div class="flex flex-col gap-6">
                  <div class="setting-item">
                    <label class="block text-sm font-medium opacity-80 mb-1">Theme</label>
                    <p class="text-xs opacity-50 mb-3">Customize the look and feel.</p>
                    <mat-form-field appearance="outline" class="w-full density-compact">
                      <mat-select [value]="currentTheme()" (valueChange)="toggleTheme()">
                        <mat-option value="light">
                          <div class="flex items-center gap-2"><mat-icon class="text-sm">light_mode</mat-icon> Light Mode</div>
                        </mat-option>
                        <mat-option value="dark">
                          <div class="flex items-center gap-2"><mat-icon class="text-sm">dark_mode</mat-icon> Dark Mode</div>
                        </mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>
              }

              @case ('Account') {
                <div class="flex flex-col gap-6">
                  <div class="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h3 class="text-red-500 font-medium text-sm mb-1">Session Management</h3>
                    <p class="text-xs opacity-60 mb-4">Sign out of your account on this device.</p>
                    <button mat-flat-button color="warn" (click)="logOut()" class="w-full">
                      <mat-icon>logout</mat-icon>
                      Sign Out
                    </button>
                  </div>
                </div>
              }

              @default {
                 <div class="flex flex-col items-center justify-center h-full opacity-50 mt-10">
                    <mat-icon class="text-4xl mb-2">{{ getIconForCategory(selectedCategory()) }}</mat-icon>
                    <p class="text-sm">{{ selectedCategory() }} settings coming soon.</p>
                 </div>
              }
            }
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Scrollbar theming */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { 
      background-color: rgba(128, 128, 128, 0.2); 
      border-radius: 20px; 
    }
    
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }
    
    .mat-icon-mobile{ margin: 0 9.6px; }
    .mat-list-mobile{ width: 100%; height: auto; aspect-ratio: 1 / 1; }

    /* Active Item - Uses a transparent overlay to work on both Light/Dark */
    .nav-pane .mat-mdc-list-item.active-item {
      background-color: rgba(128, 128, 128, 0.15); 
    }

    :host ::ng-deep .mat-mdc-list-item.justify-center .mdc-list-item__content {
       justify-content: center !important;
       padding: 0 !important;
    }

    /* Form Field Overrides:
       We use rgba() backgrounds to look good in both light and dark mode without needing hardcoded hex.
    */
    :host ::ng-deep .mat-mdc-form-field.density-compact .mat-mdc-text-field-wrapper {
      padding-top: 6px; padding-bottom: 6px; 
      background-color: rgba(128, 128, 128, 0.08) !important; /* Semi-transparent gray */
    }
    
    /* Text Color Overrides for Inputs */
    :host ::ng-deep .mat-mdc-select-value, 
    :host ::ng-deep .mat-mdc-select-arrow, 
    :host ::ng-deep .mat-mdc-form-field-label {
      color: var(--mat-sys-on-surface) !important;
    }

    .fade-in { animation: fadeIn 0.3s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SettingsDialogComponent implements OnInit {
  themeService = inject(ThemeService);
  dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private store = inject(Store<AppState>);

  selectedCategory = signal('General');
  currentTheme = computed(() => this.themeService.currentTheme());

  isMobileView = window.innerWidth <= 840;

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.isMobileView = (event.target as Window).innerWidth <= 840;
    this.updateDialogSize();
  }

  updateDialogSize() {
    if (this.isMobileView) {
      this.dialogRef.updateSize('95%', '100%');
    } else {
      this.dialogRef.updateSize('600px', '500px');
    }
  }

  ngOnInit() {
    this.updateDialogSize();
  }

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

  getIconForCategory(id: string): string {
    return this.settingsMenu.find(i => i.id === id)?.icon || 'settings';
  }
}