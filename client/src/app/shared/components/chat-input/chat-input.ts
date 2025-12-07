import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AutoGrowDirective } from '../../directives/auto-grow.directive';

// Utility validator
function noWhitespaceValidator(control: any) {
  const isWhitespace = (control.value || '').trim().length === 0;
  return isWhitespace ? { 'whitespace': true } : null;
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
    AutoGrowDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-input.html',
  styleUrls: ['./chat-input.scss']
})
export class ChatInputComponent {
  @Input() isLoading = false;
  @Input() isStreaming = false;
  
  @Output() sendMessage = new EventEmitter<string>();
  @Output() stopGeneration = new EventEmitter<void>();

  @ViewChild('chatTextarea') chatTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild(AutoGrowDirective) autoGrowDirective?: AutoGrowDirective;

  chatForm: FormGroup;
  private fb = inject(FormBuilder);

  constructor() {
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, noWhitespaceValidator]],
    });
  }

  onSubmit(): void {
    if (this.chatForm.invalid || this.isLoading) return;

    const message = this.chatForm.value.message?.trim();
    if (message) {
      this.sendMessage.emit(message);
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

  // TIWARI JI: This method allows the parent component to programmatically set text 
  // (e.g., when clicking 'Edit' on a message)
  setJsonValue(value: string): void {
    this.chatForm.patchValue({ message: value });
    // Focus and trigger auto-grow
    setTimeout(() => {
      if (this.chatTextarea) {
        this.chatTextarea.nativeElement.focus();
        this.chatTextarea.nativeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  private resetForm(): void {
    this.chatForm.reset();
    this.autoGrowDirective?.reset();
  }
}