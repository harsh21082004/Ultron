import { Directive, ElementRef, HostListener, inject, Input } from '@angular/core';

@Directive({
  selector: 'textarea[appAutoGrow]', // We'll apply this to your textarea
  standalone: true,
})
export class AutoGrowDirective {
  // Set a max height (in lines)
  @Input() appAutoGrowMaxLines: number = 4;

  private el = inject(ElementRef<HTMLTextAreaElement>);

  // Listen for the 'input' event on the host (the textarea)
  @HostListener('input')
  onInput(): void {
    this.adjustHeight();
  }

  // Also adjust height immediately on load
  ngAfterViewInit(): void {
    setTimeout(() => this.adjustHeight(), 0);
  }

  /**
   * Resets the height, which is useful after a form.reset()
   */
  public reset(): void {
    this.el.nativeElement.style.height = 'auto';
    this.el.nativeElement.style.overflowY = 'hidden';
  }

  private adjustHeight(): void {
    const textarea = this.el.nativeElement;
    
    // Reset height to 'auto' to correctly calculate scrollHeight
    textarea.style.height = 'auto';

    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || (parseFloat(computedStyle.fontSize) * 1.2);
    
    // Calculate max height based on lines
    const padding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    const maxHeight = (lineHeight * this.appAutoGrowMaxLines) + padding;

    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto'; // Show scrollbar
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden'; // Hide scrollbar
    }
  }
}
