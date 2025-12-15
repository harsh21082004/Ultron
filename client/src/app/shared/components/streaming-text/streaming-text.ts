import { 
  Component, 
  Input, 
  OnChanges, 
  SimpleChanges, 
  ElementRef, 
  ViewEncapsulation, 
  inject,
  SecurityContext
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Marked } from 'marked';

@Component({
  selector: 'app-streaming-text',
  standalone: true,
  template: ``, 
  encapsulation: ViewEncapsulation.None,
  // Using the CSS below to match your screenshots
  styleUrls: ['./streaming-text.scss'] 
})
export class StreamingTextComponent implements OnChanges {
  @Input() content = ''; 
  
  private elementRef = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private markedInstance = new Marked();
  
  private previousHtml = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.render();
    }
  }

  private render() {
    const rawHtml = this.markedInstance.parse(this.content) as string;
    const cleanHtml = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
    const nativeEl = this.elementRef.nativeElement;

    // 1. If this is a fresh render (or cleared), just set it.
    if (!this.previousHtml || !cleanHtml.startsWith(this.previousHtml)) {
      nativeEl.innerHTML = cleanHtml;
      this.previousHtml = cleanHtml;
      return;
    }

    // 2. If we are appending...
    const newPart = cleanHtml.substring(this.previousHtml.length);
      
    if (newPart.trim().length > 0) {
        // Create a hidden container to parse the new HTML chunk correctly
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newPart;

        // Move the nodes from tempDiv to our real container
        const newNodes = Array.from(tempDiv.childNodes);

        newNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // It's a Block (p, ul, h1, h2) -> Append directly (No Span Wrapper!)
            const el = node as HTMLElement;
            el.classList.add('fade-in-block'); // Animate the whole block
            nativeEl.appendChild(el);
          } 
          else if (node.nodeType === Node.TEXT_NODE) {
            // It's just text -> Wrap in span to animate characters
            if (node.textContent?.trim()) {
                const span = document.createElement('span');
                span.textContent = node.textContent;
                span.classList.add('fade-in-text');
                nativeEl.appendChild(span);
            } else {
                nativeEl.appendChild(node); // Keep newlines
            }
          }
        });

        this.previousHtml = cleanHtml; 
    }
  }
}