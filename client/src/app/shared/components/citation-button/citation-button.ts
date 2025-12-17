import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Source } from '../../../store/chat/chat.state';

@Component({
  selector: 'app-citation-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: `./citation-button.html`,
  styleUrls: ['./citation-button.scss']
})
export class CitationButtonComponent {
  @Input() source?: Source;
  @Input() index: number = 0;

  isHovered = false;
  tooltipStyles: { [key: string]: string } = {};
  placement: 'above' | 'below' = 'above';

  constructor(private elementRef: ElementRef) { }

  onMouseEnter() {
    this.updatePosition();
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.isHovered) {
      this.updatePosition();
    }
  }

  private updatePosition() {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const gap = 8;
    const viewportHeight = window.innerHeight;

    // Check space above
    const spaceAbove = rect.top;

    // Logic: Prefer 'above', but flip to 'below' if space is tight (< 100px)
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

    // Horizontal Boundary Check
    const centerX = rect.left + (rect.width / 2);
    const windowWidth = window.innerWidth;
    const halfTooltipWidth = 150;

    if (centerX < halfTooltipWidth) {
      // Too close to left
      this.tooltipStyles['left'] = `${Math.max(10, rect.left)}px`;
      this.tooltipStyles['transform'] = this.placement === 'above'
        ? 'translateY(-100%)'
        : 'none';
    } else if (centerX > windowWidth - halfTooltipWidth) {
      // Too close to right
      this.tooltipStyles['left'] = 'auto';
      this.tooltipStyles['right'] = `${Math.max(10, windowWidth - rect.right)}px`;
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