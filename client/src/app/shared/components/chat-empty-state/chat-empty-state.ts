import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center h-full text-center">
      <img src="assets/images/ultron.gif" alt="Ultron" [ngClass]="isMobileView ? 'w-14' : 'w-24'">
      
      @if (user) {
        <h1 class="font-bold text-black dark:text-white" [ngClass]="isMobileView ? 'text-xl' : 'text-4xl'">
          Good Evening, {{ user.name }}.
        </h1>
      } @else {
        <h1 class="font-bold text-black dark:text-gray-100" [ngClass]="isMobileView ? 'text-xl' : 'text-4xl'">
          Good Evening.
        </h1>
      }
      
      <h2 class="font-semibold" [ngClass]="isMobileView ? 'text-lg' : 'text-3xl'">
        Can I help you with anything?
      </h2>
    </div>

    <div class="flex flex-wrap gap-3 sm:gap-4 justify-center mt-4">
      @for (prompt of suggestions; track prompt.title) {
        <button (click)="onSuggestionClick(prompt.title)" 
                class="bg-gray-100 dark:bg-[#162731] py-1.5 sm:py-2 px-3 sm:px-5 rounded-full
                       hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-center
                       w-fit max-w-[180px] sm:max-w-[200px]">
          <h3 class="font-semibold text-[12px] sm:text-[13px] truncate whitespace-nowrap">
            {{ prompt.title }}
          </h3>
          <p class="text-[10px] sm:text-[11px] truncate whitespace-nowrap ml-1 text-gray-500">
            {{ prompt.description }}
          </p>
        </button>
      }
    </div>
  `
})
export class ChatEmptyStateComponent {
  @Input() user: User | null = null;
  @Input() isMobileView = false;
  @Input() suggestions: { title: string; description: string }[] = [];
  
  @Output() suggestionClicked = new EventEmitter<string>();

  onSuggestionClick(prompt: string): void {
    this.suggestionClicked.emit(prompt);
  }
}