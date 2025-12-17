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
import { MarkdownParserService, ContentBlock as ParserBlock } from '../../../core/services/markdown-parser.service';

// Directives & Components
import { HighlightDirective } from '../../directives/highlight.directive';
import { TableTemplateComponent } from '../table-template/table-template.component';
import { StreamingTextComponent } from '../streaming-text/streaming-text';
import { Source } from '../../../store/chat/chat.state'; // Ensure this import exists

export type ImageBlock = { type: 'image_url' | 'image'; content: string };
export type ComponentContentBlock = ParserBlock | ImageBlock;

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
  // NEW: Accept sources to pass down to streaming text
  @Input() sources?: Source[] = []; 

  private themeService = inject(ThemeService);
  private markdownService = inject(MarkdownParserService);

  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');
  
  blocks: ComponentContentBlock[] = [];
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

  parse(content: string | any): ComponentContentBlock[] {
    if (this.type === 'image_url' || this.type === 'image') {
        return [{ type: 'image_url', content: content }];
    }
    if (typeof content !== 'string') {
      return [{ type: 'text', content: content }];
    }
    const isImageUrl = content.startsWith('data:image') || 
                       (content.startsWith('http') && /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(content));

    if (isImageUrl) {
      return [{ type: 'image_url', content: content }];
    }
    if (this.sender === 'user') {
      return [{ type: 'text', content: content }];
    }
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