import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Marked } from 'marked';

// Core Services & Models
import { MarkdownParserService, ContentBlock } from '../../../core/services/markdown-parser.service';
import { ThemeService } from '../../../core/services/theme.services';

// Directives & Components
import { HighlightDirective } from '../../directives/highlight.directive';
import { TableTemplateComponent } from '../table-template/table-template.component';

@Component({
  selector: 'app-content-renderer-component',
  standalone: true,
  imports: [
    CommonModule,
    TableTemplateComponent,
    HighlightDirective,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './content-renderer.component.html',
  styleUrls: ['./content-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Optimized Change Detection
})
export class ContentRendererComponent implements OnChanges {
  @Input() content?: string;
  @Input() sender?: string;

  private themeService = inject(ThemeService);
  private parser = inject(MarkdownParserService);
  private sanitizer = inject(DomSanitizer);
  private markedInstance: Marked;

  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  blocks: ContentBlock[] = [];
  private expandedBlocks = new Set<number>();

  constructor() {
    this.markedInstance = new Marked();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-parse when content updates
    if (changes['content']) {
      this.blocks = this.parse(this.content);
    } else if (!this.content) {
      this.blocks = [];
    }

    // Reset expansion state for new messages
    if (changes['sender']) {
      this.expandedBlocks.clear();
    }
  }

  parse(text?: string): ContentBlock[] {
    // Optimization: User messages are treated as plain text, skipping complex parsing
    if (this.sender === 'user' && text) {
      return [{ type: 'text', content: text }];
    }
    return this.parser.parse(text);
  }

  sanitize(markdown: string): SafeHtml {
    if (!markdown) return this.sanitizer.bypassSecurityTrustHtml('');
    const html = this.markedInstance.parse(markdown) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // --- Helper Methods ---

  isLong(content: any): boolean {
    if (typeof content !== 'string') {
      return false;
    }
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
      console.log('Code copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy code', err);
    });
  }
}