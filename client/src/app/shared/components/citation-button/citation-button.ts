import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Source } from '../../../store/chat/chat.state';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-citation-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon],
  template: `
    @if (source) {
      <div class="citation-container" (mouseenter)="isHovered = true" (mouseleave)="isHovered = false">
        
        <button matIconButton aria-label="Example icon button with a vertical three dot icon" 
                (click)="openSource()"
                class="action-btn"
                >
          <mat-icon class="rotate-135 small-icon">link</mat-icon>
        </button>

        <!-- Custom Rich Tooltip -->
        @if (isHovered) {
          <div class="rich-tooltip animate-fade-in">
            <!-- Tooltip Icon -->
            <img [src]="source.icon || 'assets/icons/web_asset.svg'" 
                 class="tooltip-icon" 
                 onerror="this.src='assets/icons/web_asset.svg'"
                 alt="">
            
            <!-- Tooltip Text -->
            <div class="tooltip-content">
              <div class="tooltip-title">{{ source.title || 'Unknown Source' }}</div>
              <div class="tooltip-url">{{ source.uri }}</div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
      margin: 0 2px;
      position: relative; // Context for absolute tooltip
    }

    .citation-container {
      position: relative;
      display: inline-flex;
    }

    .citation-btn {
      min-width: unset !important;
      width: auto !important;
      height: 24px !important;
      padding: 0 8px !important;
      border-radius: 12px !important;
      line-height: 24px !important;
      font-size: 0.75rem !important;
      display: inline-flex !important;
      align-items: center;
      gap: 6px;
      background-color: #e3e8ee; 
      color: #374151;
      box-shadow: none !important;

      &:hover {
        background-color: #d1d9e2;
        transform: translateY(-1px);
      }
    }

    .btn-icon {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .index {
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    // --- Rich Tooltip Styles ---
    .rich-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      
      background-color: #1f2937; // Dark gray bg
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      
      display: flex;
      align-items: flex-start; // Align top for multi-line titles
      gap: 10px;
      min-width: 200px;
      max-width: 300px;
      pointer-events: none; // Let clicks pass through if needed

      // Triangle Arrow
      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #1f2937 transparent transparent transparent;
      }
    }

    .tooltip-icon {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      margin-top: 2px; // Visual alignment with title
      flex-shrink: 0;
      background: white; // Ensure favicon visibility
    }

    .tooltip-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .tooltip-title {
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .tooltip-url {
      font-size: 0.65rem;
      color: #9ca3af; // Light gray
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, 4px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    // Dark Theme Override
    :host-context(.dark-theme) {
      .citation-btn {
        background-color: #374151;
        color: #e5e7eb;
        &:hover { background-color: #4b5563; }
      }
      .rich-tooltip {
        background-color: #000;
        border: 1px solid #333;
        &::after { border-color: #000 transparent transparent transparent; }
      }
    }
    .action-btn, .action-btn span{
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
}

.small-icon{
  font-size: 18px;
  width: 18px;
  height: 18px;
}
  `]
})
export class CitationButtonComponent {
  @Input() source?: Source;
  @Input() index: number = 0;

  isHovered = false;

  openSource() {
    if (this.source?.uri) {
      window.open(this.source.uri, '_blank', 'noopener,noreferrer');
    }
  }
}