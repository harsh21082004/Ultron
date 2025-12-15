import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

// Directives
import { AutoGrowDirective } from '../../directives/auto-grow.directive';

// TIWARI JI: This interface allows us to pass complex payloads (Text + Files)
export interface ChatMessageEvent {
  message: string;
  files: File[];
}

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule, 
    MatTooltipModule, 
    MatChipsModule, 
    AutoGrowDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-input.html',
  styleUrls: ['./chat-input.scss']
})
export class ChatInputComponent {
  @Input() isLoading = false;
  @Input() isStreaming = false;
  
  @Output() sendMessage = new EventEmitter<ChatMessageEvent>();
  @Output() stopGeneration = new EventEmitter<void>();

  @ViewChild('chatTextarea') chatTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild(AutoGrowDirective) autoGrowDirective?: AutoGrowDirective;

  chatForm: FormGroup;
  files: File[] = []; // Stores attached files locally until send
  
  private fb = inject(FormBuilder);

  constructor() {
    // No validators needed here because we manually check (text OR files)
    this.chatForm = this.fb.group({
      message: [''], 
    });
  }

  /**
   * Handles file selection from hidden inputs
   */
  onFileSelected(event: any): void {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Prevent duplicates (optional, based on name)
      if (!this.files.some(f => f.name === selectedFile.name)) {
        this.files.push(selectedFile);
      }
      // Reset input so the same file can be selected again if needed (e.g. after removing)
      event.target.value = ''; 
    }
  }

  /**
   * Removes a file from the chips list
   */
  removeFile(file: File): void {
    const index = this.files.indexOf(file);
    if (index >= 0) {
      this.files.splice(index, 1);
    }
  }

  onSubmit(): void {
    if (this.isLoading) return;

    const message = this.chatForm.value.message?.trim() || '';
    
    // TIWARI JI: Allow sending if there is text OR at least one file
    if (message || this.files.length > 0) {
      this.sendMessage.emit({ 
        message, 
        files: [...this.files] // Send a copy of the array
      });
      
      this.resetForm();
    }
  }

  onStop(): void {
    this.stopGeneration.emit();
  }

  handleEnterPress(event: KeyboardEvent): void {
    if (!event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    }
  }

  /**
   * Public method for Parent to set text (e.g. Edit functionality)
   */
  setJsonValue(value: string): void {
    this.chatForm.patchValue({ message: value });
    setTimeout(() => {
      if (this.chatTextarea) {
        this.chatTextarea.nativeElement.focus();
        // Trigger auto-grow
        this.chatTextarea.nativeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  private resetForm(): void {
    this.chatForm.reset();
    this.files = []; // Clear chips
    this.autoGrowDirective?.reset();
  }
}