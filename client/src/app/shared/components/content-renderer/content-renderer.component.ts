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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Services
import { ThemeService } from '../../../core/services/theme.services';
import { MarkdownParserService, ContentBlock } from '../../../core/services/markdown-parser.service';

// Directives & Components
import { HighlightDirective } from '../../directives/highlight.directive';
import { TableTemplateComponent } from '../table-template/table-template.component';
import { StreamingTextComponent } from '../streaming-text/streaming-text';
import { Source } from '../../../store/chat/chat.state'; 

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
  @Input() type?: string;
  @Input() sources?: Source[] = []; 

  private themeService = inject(ThemeService);
  private markdownService = inject(MarkdownParserService);

  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  
  // Use the ContentBlock type from the service which now includes ImageBlock
  blocks: ContentBlock[] = [];
  private expandedBlocks = new Set<number>(); 

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['type']) {
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

  parse(content: string | any): ContentBlock[] {
    // 1. Check if the message ITSELF is just an image (e.g. User uploaded image)
    if (this.type === 'image_url' || this.type === 'image') {
        return [{ type: 'image_url', content: content }];
    }
    
    // 2. Check content string for raw Base64 or Image URL
    if (typeof content === 'string') {
        const isRawImageUrl = content.startsWith('data:image') || 
                              (content.startsWith('http') && /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(content));

        if (isRawImageUrl) {
          return [{ type: 'image_url', content: content }];
        }
    }

    // 3. User messages are just text (no markdown parsing for performance/safety)
    if (this.sender === 'user') {
      return [{ type: 'text', content: content }];
    }

    // 4. AI Messages -> Parse Markdown (Now handles mixed text/images/code)
    return this.markdownService.parse(content);
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
    navigator.clipboard.writeText(code);
  }
}