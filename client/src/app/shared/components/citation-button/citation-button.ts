import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Source } from '../../../store/chat/chat.state';

@Component({
  selector: 'app-citation-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    @if (source) {
      <div class="citation-container" 
           (mouseenter)="onMouseEnter()" 
           (mouseleave)="onMouseLeave()">
        
        <button mat-icon-button 
                class="action-btn"
                aria-label="View Source" 
                (click)="openSource()">
          <mat-icon class="rotate-135 small-icon">link</mat-icon>
        </button>

        <!-- Custom Rich Tooltip -->
        <!-- Added [ngStyle] for dynamic fixed positioning and [class] for arrow direction -->
        @if (isHovered) {
          <div class="rich-tooltip animate-fade-in" 
               [ngStyle]="tooltipStyles"
               [class.tooltip-above]="placement === 'above'"
               [class.tooltip-below]="placement === 'below'">
            
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
    }

    .citation-container {
      position: relative;
      display: inline-flex;
    }

    .action-btn {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      background-color: #e3e8ee;
      color: #374151;
      border-radius: 50%; // Circular button for the icon
      
      &:hover {
        background-color: #d1d9e2;
      }
    }

    .small-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    // --- Rich Tooltip Styles ---
    .rich-tooltip {
      position: fixed; // FIXED: Breaks out of overflow:hidden containers
      z-index: 10000;  // Ensure it sits on top of everything
      
      background-color: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 200px;
      max-width: 300px;
      pointer-events: none;

      // Base Arrow (hidden by default, shown by specific class)
      &::after {
        content: '';
        position: absolute;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
      }
    }

    // Arrow pointing DOWN (Tooltip is ABOVE)
    .tooltip-above::after {
      top: 100%;
      border-color: #1f2937 transparent transparent transparent;
    }

    // Arrow pointing UP (Tooltip is BELOW)
    .tooltip-below::after {
      bottom: 100%;
      border-color: transparent transparent #1f2937 transparent;
    }

    .tooltip-icon {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      margin-top: 2px;
      flex-shrink: 0;
      background: white;
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
      color: #9ca3af;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    // Dark Theme Override
    :host-context(.dark-theme) {
      .action-btn {
        background-color: #374151;
        color: #e5e7eb;
        &:hover { background-color: #4b5563; }
      }
      .rich-tooltip {
        background-color: #000;
        border: 1px solid #333;
      }
      .tooltip-above::after { border-color: #000 transparent transparent transparent; }
      .tooltip-below::after { border-color: transparent transparent #000 transparent; }
    }
  `]
})
export class CitationButtonComponent {
  @Input() source?: Source;
  @Input() index: number = 0;
  
  isHovered = false;
  tooltipStyles: { [key: string]: string } = {};
  placement: 'above' | 'below' = 'above';
  
  constructor(private elementRef: ElementRef) {}

  onMouseEnter() {
    this.updatePosition();
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }

  // Update position on scroll too, in case user scrolls while hovering
  @HostListener('window:scroll')
  onScroll() {
    if (this.isHovered) {
      this.updatePosition();
    }
  }

  private updatePosition() {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const tooltipHeight = 80; // Estimated height including arrow
    const gap = 8;
    
    // Check space above
    const spaceAbove = rect.top;
    
    // Default to 'above' unless space is tight (< 100px from top)
    if (spaceAbove < 100) {
      this.placement = 'below';
      this.tooltipStyles = {
        'top': `${rect.bottom + gap}px`,
        'left': `${rect.left + (rect.width / 2)}px`,
        'transform': 'translateX(-50%)'
      };
    } else {
      this.placement = 'above';
      this.tooltipStyles = {
        'top': `${rect.top - gap}px`,
        'left': `${rect.left + (rect.width / 2)}px`,
        'transform': 'translateX(-50%) translateY(-100%)'
      };
    }

    // Horizontal Boundary Check (Prevent clipping on left/right edges)
    const centerX = rect.left + (rect.width / 2);
    const windowWidth = window.innerWidth;
    const halfTooltipWidth = 150; // Approx

    if (centerX < halfTooltipWidth) {
      // Too close to left edge -> Shift right
      this.tooltipStyles['left'] = `${rect.left}px`;
      this.tooltipStyles['transform'] = this.placement === 'above' 
        ? 'translateY(-100%)' 
        : 'none';
      // Note: Arrow might be slightly off-center in this edge case, which is acceptable
    } else if (centerX > windowWidth - halfTooltipWidth) {
      // Too close to right edge -> Shift left
      this.tooltipStyles['left'] = 'auto';
      this.tooltipStyles['right'] = `${windowWidth - rect.right}px`;
      this.tooltipStyles['transform'] = this.placement === 'above' 
        ? 'translateY(-100%)' 
        : 'none';
    }
  }

  openSource() {
    if (this.source?.uri) {
      window.open(this.source.uri, '_blank', 'noopener,noreferrer');
    }
  }
}