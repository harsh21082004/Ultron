import {
  Component, Input, OnChanges, SimpleChanges, computed, inject, ChangeDetectionStrategy,
  Output, EventEmitter // [ADDED]
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ThemeService } from '../../../core/services/theme.services';
import { MarkdownParserService, ContentBlock } from '../../../core/services/markdown-parser.service';
import { HighlightDirective } from '../../directives/highlight.directive';
import { TableTemplateComponent } from '../table-template/table-template.component';
import { StreamingTextComponent } from '../streaming-text/streaming-text';
import { Source } from '../../../store/chat/chat.state'; 

export type VideoBlock = {
  type: 'video';
  content: string; 
  youtubeUrl?: SafeResourceUrl;
};

export type ExtendedContentBlock = ContentBlock | VideoBlock;

@Component({
  selector: 'app-content-renderer-component',
  standalone: true,
  imports: [ 
    CommonModule, TableTemplateComponent, HighlightDirective,
    MatIconModule, MatButtonModule, StreamingTextComponent
  ],
  templateUrl: './content-renderer.component.html',
  styleUrls: ['./content-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentRendererComponent implements OnChanges {
  @Input() content?: string | any;
  @Input() sender?: string;
  @Input() type?: string;
  @Input() sources?: Source[] = [];

  // [ADDED] Output event for image clicks
  @Output() imageClick = new EventEmitter<string>();

  private themeService = inject(ThemeService);
  private markdownService = inject(MarkdownParserService);
  private sanitizer = inject(DomSanitizer);

  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  blocks: ExtendedContentBlock[] = [];
  private expandedBlocks = new Set<number>(); 

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['type']) {
      if (this.content !== undefined && this.content !== null) {
        this.blocks = this.parse(this.content);
      }
    }
  }

  // ... (parse method remains exactly the same as your code) ...
  parse(content: string | any): ExtendedContentBlock[] {
    // 1. Explicit Image Type
    if (this.type === 'image_url' || this.type === 'image') {
      return [{ type: 'image_url', content: content }];
    }

    // 2. String Auto-Detection & YouTube Parsing
    if (typeof content === 'string') {
      const trimmed = content.trim();
      
      const isUrl = trimmed.startsWith('http') || trimmed.startsWith('data:image');
      const isCleanUrl = isUrl && !trimmed.includes(' ') && !trimmed.includes('\n');

      if ((isCleanUrl && /\.(jpeg|jpg|gif|png|webp)$/i.test(trimmed)) || trimmed.startsWith('data:image')) {
        return [{ type: 'image_url', content: trimmed }];
      }

      // [YOUTUBE LOGIC]
      const parts = content.split(/\[\[YOUTUBE:\s*([a-zA-Z0-9_-]+)\s*\]\]/);
      
      if (parts.length === 1) {
        if (this.sender === 'user') return [{ type: 'text', content: content }];
        return this.markdownService.parse(content) as ExtendedContentBlock[];
      }

      const mixedBlocks: ExtendedContentBlock[] = [];
      
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i].trim()) {
            if (this.sender === 'user') {
              mixedBlocks.push({ type: 'text', content: parts[i] });
            } else {
              const mdBlocks = this.markdownService.parse(parts[i]);
              mixedBlocks.push(...(mdBlocks as ExtendedContentBlock[]));
            }
          }
        } 
        else {
          const videoId = parts[i];
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
          mixedBlocks.push({ 
            type: 'video', 
            content: videoId,
            youtubeUrl: safeUrl 
          });
        }
      }
      return mixedBlocks;
    }

    if (this.sender === 'user') {
      return [{ type: 'text', content: content } as any];
    }

    return this.markdownService.parse(content) as ExtendedContentBlock[];
  }

  isLong(content: any): boolean { return typeof content === 'string' && (content.split('\n').length > 10 || content.length > 1000); }
  isExpanded(index: number): boolean { return this.expandedBlocks.has(index); }
  toggleExpand(index: number): void { this.expandedBlocks.has(index) ? this.expandedBlocks.delete(index) : this.expandedBlocks.add(index); }
  copyCode(code: string): void { navigator.clipboard.writeText(code); }
}