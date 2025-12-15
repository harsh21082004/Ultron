import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { marked } from 'marked';

// Services
import { ThemeService } from '../../../core/services/theme.services';

// Directives & Components
import { HighlightDirective } from '../../directives/highlight.directive';
import { TableTemplateComponent } from '../table-template/table-template.component';
import { StreamingTextComponent } from '../streaming-text/streaming-text';

export interface ContentBlock {
  type: 'text' | 'code' | 'image_url' | 'table' | 'image';
  content: any;
}

@Component({
  selector: 'app-content-renderer-component',
  standalone: true,
  imports: [ 
    CommonModule,
    TableTemplateComponent,
    HighlightDirective,
    MatIconModule,
    MatButtonModule,
    StreamingTextComponent
  ],
  templateUrl: './content-renderer.component.html',
  styleUrls: ['./content-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentRendererComponent implements OnChanges {
  @Input() content?: string | any;
  @Input() sender?: string;

  private themeService = inject(ThemeService);
  private sanitizer = inject(DomSanitizer);

  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  blocks: ContentBlock[] = [];
  private expandedBlocks = new Set<number>(); 

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      // Guard against undefined content
      if (this.content !== undefined && this.content !== null) {
        this.blocks = this.parse(this.content);
      }
    } else if (!this.content) {
      this.blocks = [];
    }

    if (changes['sender']) {
      this.expandedBlocks.clear();
    }
  }

  /**
   * Robust parsing logic using marked.lexer to split Text vs Code
   */
  parse(content: string | any): ContentBlock[] {
    // 1. Handle non-string content (already parsed objects)
    if (typeof content !== 'string') {
      return [{ type: 'text', content: content }];
    }

    // 2. Handle Image URLs (Basic Heuristic)
    if (content.startsWith('data:image') || (content.startsWith('http') && content.match(/\.(jpeg|jpg|gif|png)$/))) {
      return [{ type: 'image_url', content: content }];
    }

    // 3. User Messages: Treat as single text block for performance
    if (this.sender === 'user') {
      return [{ type: 'text', content: content }];
    }

    // 4. AI Messages: Parse Markdown to separate Code Blocks
    const tokens = marked.lexer(content);
    const newBlocks: ContentBlock[] = [];
    
    // We group consecutive non-code tokens into a single "text" block 
    // so the StreamingTextComponent can render them together (preserving lists, paragraphs, etc.)
    let currentTextRaw = '';

    tokens.forEach((token) => {
      if (token.type === 'code') {
        // A. If we have accumulated text, push it first
        if (currentTextRaw) {
          newBlocks.push({ type: 'text', content: currentTextRaw });
          currentTextRaw = '';
        }

        // B. Push the Code Block
        newBlocks.push({
          type: 'code',
          content: {
            code: token.text,
            language: token.lang || 'plaintext' // Fallback to avoid 'undefined'
          }
        });
      } else {
        // C. Accumulate text/other tokens
        currentTextRaw += token.raw;
      }
    });

    // Push any remaining text
    if (currentTextRaw) {
      newBlocks.push({ type: 'text', content: currentTextRaw });
    }

    return newBlocks;
  }

  isLong(content: any): boolean {
    if (typeof content !== 'string') return false;
    return content.split('\n').length > 10 || content.length > 1000;
  }

  isExpanded(index: number): boolean {
    return this.expandedBlocks.has(index);
  }

  toggleExpand(index: number): void {
    if (this.expandedBlocks.has(index)) {
      this.expandedBlocks.delete(index);
    } else {
      this.expandedBlocks.add(index);
    }
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      // Optional: Add toast notification here
    }).catch(err => {
      console.error('Failed to copy code', err);
    });
  }
}