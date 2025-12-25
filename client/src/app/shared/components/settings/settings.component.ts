import { Component, computed, HostListener, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Store & Services
import { Store } from '@ngrx/store';
import { AppState } from '../../../store';
import { selectAuthUser, selectAuthLoading } from '../../../store/auth/auth.selectors';
import { ThemeService } from '../../../core/services/theme.services';
import { User } from '../../models/user.model';
import { AuthActions } from '../../../store/auth/auth.actions';
import { FileUploadService } from '../../../core/services/file-upload.service'; // Ensure this path is correct

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
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="settings-container bg-[var(--mat-menu-container-color)] text-[var(--mat-sys-on-surface)] flex flex-col overflow-hidden h-full w-full">
      
      <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
        <h2 class="text-lg font-semibold tracking-wide">{{ selectedCategory() }}</h2>
        <button mat-icon-button (click)="closeDialog()" class="text-[var(--mat-sys-on-surface)] opacity-60 hover:opacity-100 transition-opacity">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="flex flex-grow overflow-hidden">
        
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

        <div class="content-pane p-4 sm:p-6 overflow-y-auto custom-scrollbar relative"
             [ngClass]="isMobileView ? 'w-[calc(100%-60px)]' : 'w-2/3'">
          
          @if (isLoading() || isUploading()) {
             <div class="absolute inset-0 bg-black/10 dark:bg-white/5 z-50 flex items-center justify-center backdrop-blur-sm">
                <mat-spinner diameter="40"></mat-spinner>
             </div>
          }

          <div class="fade-in max-w-lg mx-auto">
            @switch (selectedCategory()) {
              @case ('Profile') {
                <div class="flex flex-col gap-6 items-center">
                  
                  <div class="relative group cursor-pointer" (click)="fileInput.click()">
                    <img height="20" width="20" [src]="editData.profilePic || 'assets/images/profile.png'" 
                         class="w-28 h-28 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 shadow-md group-hover:opacity-80 transition-opacity">
                    
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <mat-icon class="text-white drop-shadow-md text-3xl font-bold">edit</mat-icon>
                    </div>
                    
                    @if (isUploading()) {
                        <div class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                            <mat-spinner diameter="24" color="accent"></mat-spinner>
                        </div>
                    }

                    <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" hidden>
                  </div>
                  <p class="text-xs text-center opacity-60 -mt-4">
                      {{ isUploading() ? 'Uploading...' : 'Click to change avatar' }}
                  </p>

                  <div class="w-full">
                    <label class="block text-sm font-medium opacity-80 mb-1">Display Name</label>
                    <mat-form-field appearance="outline" class="w-full density-compact">
                      <input matInput [(ngModel)]="editData.name" placeholder="Your Name">
                      <mat-icon matSuffix>edit</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="w-full">
                    <label class="block text-sm font-medium opacity-80 mb-1">Email</label>
                    <mat-form-field appearance="outline" class="w-full density-compact opacity-70">
                      <input matInput [value]="currentUser()?.email" disabled>
                      <mat-icon matSuffix>lock</mat-icon>
                    </mat-form-field>
                  </div>

                  <button mat-flat-button color="primary" class="w-full mt-2" 
                          [disabled]="!hasChanges() || isLoading() || isUploading()" 
                          (click)="saveProfile()">
                    Save Changes
                  </button>
                  
                  <div class="w-full border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  <button mat-stroked-button color="warn" (click)="logOut()" class="w-full">
                    <mat-icon>logout</mat-icon> Sign Out
                  </button>
                </div>
              }

              @case ('General') {
                <div class="flex flex-col gap-6">
                  <div class="setting-item">
                    <label class="block text-sm font-medium opacity-80 mb-1">AI Language</label>
                    <p class="text-xs opacity-50 mb-3">Ultron will respond to you in this language.</p>
                    <mat-form-field appearance="outline" class="w-full density-compact">
                      <mat-select [(value)]="editData.preferences.language" (selectionChange)="savePreference('language', $event.value)">
                        <mat-option value="English">English</mat-option>
                        <mat-option value="Hindi">Hindi (हिंदी)</mat-option>
                        <mat-option value="Spanish">Spanish (Español)</mat-option>
                        <mat-option value="French">French (Français)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>
              }

              @case ('Appearance') {
                <div class="flex flex-col gap-6">
                  <div class="setting-item">
                    <label class="block text-sm font-medium opacity-80 mb-1">App Theme</label>
                    <mat-form-field appearance="outline" class="w-full density-compact">
                      <mat-select [value]="currentTheme()" (valueChange)="onThemeChange($event)">
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
              
              @case ('Data Controls') {
                 <div class="flex flex-col gap-4">
                    <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 class="font-medium">Export Data</h3>
                        <p class="text-xs opacity-60 mb-3">Download a JSON file of your chat history.</p>
                        <button mat-stroked-button>Export JSON</button>
                    </div>
                    <div class="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <h3 class="text-red-500 font-medium">Delete History</h3>
                        <p class="text-xs opacity-60 mb-3">Permanently remove all chats. This cannot be undone.</p>
                        <button mat-flat-button color="warn">Delete All Chats</button>
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
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(128, 128, 128, 0.2); border-radius: 20px; }
    
    :host { display: block; height: 100%; width: 100%; }
    .mat-icon-mobile{ margin: 0 9.6px; }
    .nav-pane .mat-mdc-list-item.active-item { background-color: rgba(128, 128, 128, 0.15); }
    
    :host ::ng-deep .mat-mdc-form-field.density-compact .mat-mdc-text-field-wrapper {
      padding-top: 6px; padding-bottom: 6px; 
      background-color: rgba(128, 128, 128, 0.08) !important;
    }
    :host ::ng-deep .mat-mdc-select-value, :host ::ng-deep .mat-mdc-select-arrow, :host ::ng-deep .mat-mdc-form-field-label, :host ::ng-deep .mat-mdc-input-element {
      color: var(--mat-sys-on-surface) !important;
    }
    .fade-in { animation: fadeIn 0.3s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SettingsDialogComponent implements OnInit {
  // Dependencies
  private themeService = inject(ThemeService);
  private dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private store = inject(Store<AppState>);
  private fileUploadService = inject(FileUploadService); // INJECTED

  // Signals
  selectedCategory = signal('Profile');
  currentTheme = computed(() => this.themeService.currentTheme());
  currentUser = this.store.selectSignal(selectAuthUser);
  isLoading = this.store.selectSignal(selectAuthLoading);
  isUploading = signal(false); // NEW SIGNAL

  // Local Form State
  editData: Partial<User> & { preferences: any } = { 
    name: '', 
    profilePic: '', 
    preferences: { language: 'English', theme: 'light' } 
  };

  isMobileView = window.innerWidth <= 840;

  settingsMenu = [
    { id: 'Profile', name: 'Profile', icon: 'person' },
    { id: 'General', name: 'General', icon: 'settings' },
    { id: 'Appearance', name: 'Appearance', icon: 'palette' },
    { id: 'Data Controls', name: 'Data Controls', icon: 'dataset' },
  ];

  constructor() {
    // Sync local form with Store User Data
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.editData = {
          name: user.name,
          profilePic: user.profilePic,
          preferences: {
            language: user.preferences?.language || 'English',
            theme: user.preferences?.theme || 'light'
          }
        };
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.isMobileView = (event.target as Window).innerWidth <= 840;
    this.updateDialogSize();
  }

  ngOnInit() {
    this.updateDialogSize();
  }

  updateDialogSize() {
    this.isMobileView 
      ? this.dialogRef.updateSize('95%', '100%') 
      : this.dialogRef.updateSize('700px', '550px');
  }

  // --- ACTIONS ---

  // 1. Theme Change
  onThemeChange(newTheme: string) {
    if (newTheme === 'light') this.themeService.setTheme("light");
    if (newTheme === 'dark') this.themeService.setTheme("dark");
    this.savePreference('theme', newTheme);
  }

  // 2. Profile Picture Upload (UPDATED)
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploading.set(true); // Start Spinner

      // 1. Local Preview (Immediate feedback)
      const reader = new FileReader();
      reader.onload = () => {
         // Temporarily show local image while uploading
         // Note: We don't save this base64 string, we wait for the URL
         // But setting it here updates the UI immediately.
         this.editData.profilePic = reader.result as string; 
      };
      reader.readAsDataURL(file);

      // 2. Upload to Cloud
      this.fileUploadService.upload(file, 'profile').subscribe({
        next: (response) => {
          // Success: Update editData with the REAL Cloud URL
          // Assuming response structure: { files: [ { url: '...' } ] }
          if (response.files && response.files.length > 0) {
             this.editData.profilePic = response.files[0].url;
          }
          this.isUploading.set(false); // Stop Spinner
        },
        error: (err) => {
          console.error('Upload failed:', err);
          // Revert or show error toast
          this.isUploading.set(false); // Stop Spinner
        }
      });
    }
  }

  // 3. Save Logic
  hasChanges(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return this.editData.name !== user.name || this.editData.profilePic !== user.profilePic;
  }

  saveProfile() {
    // Dispatch Action to Update API with the new Cloud URL and Name
    this.store.dispatch(AuthActions.updateUserProfile({
      data: {
        name: this.editData.name,
        profilePic: this.editData.profilePic
      }
    }));
  }

  savePreference(key: string, value: any) {
    const currentPrefs = this.editData.preferences || {};
    const newPrefs = { ...currentPrefs, [key]: value };
    
    // We send only the preferences part to update
    this.store.dispatch(AuthActions.updateUserProfile({
      data: { preferences: newPrefs }
    }));
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