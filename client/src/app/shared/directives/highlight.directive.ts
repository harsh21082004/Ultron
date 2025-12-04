import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
// Import the core library (Standard, robust, no Angular version conflicts)
import hljs from 'highlight.js';

@Directive({
  selector: '[appHighlight]', // Usage: <code [appHighlight]="codeString">
  standalone: true
})
export class HighlightDirective implements OnChanges {
  @Input('appHighlight') code = '';
  @Input() language = '';

  private el = inject(ElementRef);

  ngOnChanges(): void {
    if (!this.code) return;

    // 1. Highlight the code
    let result;
    if (this.language && hljs.getLanguage(this.language)) {
      // If language is known, use it
      try {
        result = hljs.highlight(this.code, { language: this.language, ignoreIllegals: true });
      } catch (e) {
        // Fallback if highlighting fails
        result = hljs.highlightAuto(this.code);
      }
    } else {
      // Auto-detect
      result = hljs.highlightAuto(this.code);
    }

    // 2. Insert the HTML
    this.el.nativeElement.innerHTML = result.value;
    
    // 3. Add the class for styling (e.g., 'hljs')
    this.el.nativeElement.classList.add('hljs');
  }
}