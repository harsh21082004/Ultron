import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  MarkdownParserService,
  ContentBlock,
} from '../../../core/services/markdown-parser.service';
import { TableTemplateComponent } from '../table-template/table-template.component';
import { CodeEditorCanvasComponent } from '../code-editor-canvas/code-editor-canvas.component';
import { ThemeService } from '../../../core/services/theme.services';


import { marked, Marked, Tokens } from 'marked';

@Component({
  selector: 'app-content-renderer-component',
  standalone: true,
  imports: [CommonModule, TableTemplateComponent, CodeEditorCanvasComponent],
  template: `
    <!-- 
      MODIFIED: Switched to @for loop to get $index
    -->
    @for (block of blocks; track $index) {
      <ng-container [ngSwitch]="block.type">
        
        <!-- === THIS IS THE MAIN FIX === -->
        <ng-container *ngSwitchCase="'text'">
          
          <!-- 1. IF the sender is 'user', render as plain text AND check if long -->
          @if (sender === 'user') {
            @if (isLong(block.content)) {
              <!-- 1a. User's LONG text. Add expand/collapse logic -->
              <div>
                <div 
                  class="user-text-simple" 
                  [class.truncate-lines]="!isExpanded($index)">
                  {{ block.content }}
                </div>
                <button (click)="toggleExpand($index)" class="expand-button" [class.dark-mode]="isDarkMode()">
                  {{ isExpanded($index) ? 'Show Less' : 'Show More' }}
                </button>
              </div>
            } @else {
               <!-- 1b. User's SHORT text. -->
              <div class="user-text-simple">{{ block.content }}</div>
            }
          } @else {
            <!-- 2. ELSE (sender is 'ai'), use the full markdown/prose rendering (no truncation) -->
            <div
              class="prose"
              [class.dark-prose]="isDarkMode()"
              [innerHTML]="sanitize($any(block.content))"
            ></div>
          }

        </ng-container>
        <!-- === END OF FIX === -->

        <!-- Table block (no change) -->
        <app-table-template-component
          *ngSwitchCase="'table'"
          [data]="$any(block.content)"
        ></app-table-template-component>
        
        <!-- Code block (no change) -->
        <app-code-editor-canvas-component
          *ngSwitchCase="'code'"
          [code]="$any(block.content).code"
          [language]="$any(block.content).language"
        >
        </app-code-editor-canvas-component>

      </ng-container>
    }
  `,
  styles: [
    `
    /* FIX: Replaced .sender-prose with this style
      for simple user text.
    */
    .user-text-simple {
      margin: 0;
      padding: 0;
      line-height: 1.5; /* Standard text line height */
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* --- NEW STYLES for Truncation --- */

    .truncate-lines {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 10; /* The 10 lines you requested */
      overflow: hidden;
    }

    .expand-button {
      background: none;
      border: none;
      color: #8b5cf6; /* A purple, tailwind-like color */
      cursor: pointer;
      font-weight: 500;
      padding: 4px 0;
      margin-top: 8px;
    }
    .expand-button:hover {
      text-decoration: underline;
    }

    /* UPDATED: Dark mode rule is no longer tied to .prose */
    .expand-button.dark-mode {
      color: #a78bfa; /* Lighter purple for dark mode */
    }

    /* --- END NEW STYLES --- */


    :host ::ng-deep .dark-prose {
      code{
        background-color: #132a39 !important;
      }
    }

    :host ::ng-deep .prose {
      /* NOTE: These .prose styles now *only* apply
        to the AI's messages.
      */
       line-height: 0.6;
       margin: 0.25rem 0;
       white-space: pre-wrap;
       word-break: break-word;

      .prose {
        line-height: 1;
        margin: 0.5rem 0;
        white-space: pre-wrap;
        word-break: break-word;
      }

      h1, h2, h3, h4, h5, h6 {
         margin-top: 0.25em;
         margin-bottom: 0.25em;
         font-weight: 500;
         line-height: 1;
      }
      h1 { font-size: 1.2rem; }
      h2 { font-size: 1.1rem; }
      h3 { font-size: 1.05rem; }

      p {
        margin-bottom: 0.5em;
        line-height: 1.5;
      }

      ul, ol {
         margin-left: 1.5em;
         margin-bottom: 1em;
         list-style-position: outside;
         line-height: 1;
      }
      ul { list-style-type: disc; }
      ol { list-style-type: decimal; }
      li { margin-bottom: 0.25em; line-height: 1.5; }

      code {
         background-color: #d4d9df; 
         padding: 0.1em 0.35em;
         border-radius: 6px;
         font-family: monospace;
         font-size: 0.85em;
      }

      :host ::ng-deep app-code-editor-canvas,
      :host ::ng-deep app-table-template {
        margin: 0.5rem 0;
      }
    }

      :host ::ng-deep app-code-editor-canvas,
      :host ::ng-deep app-table-template {
        margin: 1rem 0;
      }
    `,
  ],
})
export class ContentRendererComponent implements OnChanges { // <-- Renamed to component
  @Input() content?: string;
  @Input() sender?: string;
  private themeService = inject(ThemeService);
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');

  blocks: ContentBlock[] = [];
  private parser = inject(MarkdownParserService);
  private sanitizer = inject(DomSanitizer); // <-- TYPO FIX
  private markedInstance: Marked;

  // --- NEW: State for tracking expanded blocks ---
  private expandedBlocks = new Set<number>();

  constructor() {
    this.markedInstance = new Marked();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      // When content changes (e.g., streaming), re-parse
      this.blocks = this.parse(this.content);
    } else if (!this.content) {
      this.blocks = [];
    }
    
    // When the component re-renders (e.g., new message),
    // clear the expansion state for the *next* message.
    // This assumes one ContentRenderer per message.
    if (changes['sender']) {
      this.expandedBlocks.clear();
    }
  }

  parse(text?: string): ContentBlock[] {
    // --- THIS IS THE KEY ---
    // If the sender is 'user', we don't parse. We just return
    // a single text block with the raw content.
    if (this.sender === 'user' && text) {
      return [{ type: 'text', content: text }];
    }
    
    // If the sender is 'ai', we use the full parser.
    return this.parser.parse(text);
  }

  sanitize(markdown: string): SafeHtml {
    if (!markdown) return this.sanitizer.bypassSecurityTrustHtml('');
    const html = this.markedInstance.parse(markdown) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // --- NEW HELPER METHODS ---

  /**
   * Checks if a block of content is "long" (over 10 lines).
   */
  isLong(content: any): boolean {
    if (typeof content !== 'string') {
      return false;
    }
    // Check if lines > 10 OR total length is very long
    return content.split('\n').length > 10 || content.length > 1000;
  }

  /**
   * Checks if a specific block index is in the expanded set.
   */
  isExpanded(index: number): boolean {
    return this.expandedBlocks.has(index);
  }

  /**
   * Toggles the expanded state for a given block index.
   */
  toggleExpand(index: number): void {
    if (this.expandedBlocks.has(index)) {
      this.expandedBlocks.delete(index);
    } else {
      this.expandedBlocks.add(index);
    }
  }
}

