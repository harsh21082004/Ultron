import { 
  Component, 
  Input, 
  OnChanges, 
  SimpleChanges, 
  ElementRef, 
  ViewEncapsulation, 
  inject,
  SecurityContext,
  Renderer2,
  ViewContainerRef,
  EnvironmentInjector,
  createComponent,
  ApplicationRef,
  OnDestroy,
  AfterViewChecked,
  ComponentRef
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Marked } from 'marked';
import { Source } from '../../../store/chat/chat.state';
import { CitationButtonComponent } from '../citation-button/citation-button';

@Component({
  selector: 'app-streaming-text',
  standalone: true,
  template: ``, 
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./streaming-text.scss'] 
})
export class StreamingTextComponent implements OnChanges, OnDestroy {
  @Input() content = ''; 
  @Input() sources: Source[] = [];
  
  private elementRef = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private markedInstance = new Marked();
  
  private previousHtml = '';
  // Track created components to destroy them properly to prevent memory leaks
  private componentRefs: ComponentRef<CitationButtonComponent>[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['sources']) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.destroyComponents();
  }

  private destroyComponents() {
    if (this.componentRefs.length > 0) {
        this.componentRefs.forEach(ref => ref.destroy());
        this.componentRefs = [];
    }
  }

  private render() {
    let rawHtml = this.markedInstance.parse(this.content) as string;
    
    // 1. Regex Replace: Swap [1] with a unique placeholder element.
    // FIX: We use a class 'idx-{n}' instead of data-index because Angular's
    // sanitizer often strips custom data attributes but preserves classes.
    if (this.sources && this.sources.length > 0) {
        rawHtml = rawHtml.replace(/\[(\d+)\]/g, (match, digits) => {
            const index = parseInt(digits, 10) - 1; 
            // Only create placeholder if source exists
            if (this.sources[index]) {
                return `<span class="citation-mount-point idx-${index}"></span>`;
            }
            return match;
        });
    }

    const cleanHtml = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
    const nativeEl = this.elementRef.nativeElement;

    // 2. DOM Update Logic
    // If the HTML structure changed significantly (start of stream or major edit), reset everything
    if (!this.previousHtml || !cleanHtml.startsWith(this.previousHtml)) {
      this.destroyComponents(); // Clear old buttons
      nativeEl.innerHTML = cleanHtml;
      this.previousHtml = cleanHtml;
      this.mountCitations(nativeEl); 
    } else {
      // 3. Smart Append Logic (for streaming)
      // Only process the *new* part of the string to avoid re-rendering existing buttons
      const newPart = cleanHtml.substring(this.previousHtml.length);
      if (newPart.trim().length > 0) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newPart;
          
          const newNodes = Array.from(tempDiv.childNodes);
          newNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              el.classList.add('fade-in-block');
              nativeEl.appendChild(el);
            } 
            else if (node.nodeType === Node.TEXT_NODE) {
              if (node.textContent?.trim()) {
                  const span = document.createElement('span');
                  span.textContent = node.textContent;
                  span.classList.add('fade-in-text');
                  nativeEl.appendChild(span);
              } else {
                  nativeEl.appendChild(node);
              }
            }
          });
          
          this.previousHtml = cleanHtml;
          // Mount citations in the container (checks for empty mount points)
          this.mountCitations(nativeEl);
      }
    }
  }

  /**
   * Scans the DOM for empty mount points and inserts Angular Components.
   */
  private mountCitations(root: HTMLElement) {
    const mountPoints = root.querySelectorAll('.citation-mount-point');
    
    mountPoints.forEach((mountPoint: Element) => {
        // IMPORTANT: If already mounted (has children), skip it.
        if (mountPoint.hasChildNodes()) return;

        // FIX: Extract index from class name (e.g., "citation-mount-point idx-2")
        // because data-attributes might be sanitized.
        let index = 0;
        const match = mountPoint.className.match(/idx-(\d+)/);
        if (match) {
            index = parseInt(match[1], 10);
        }

        const source = this.sources[index];

        if (source) {
            // 4. Dynamic Component Creation
            // This creates the CitationButtonComponent instance
            const componentRef = createComponent(CitationButtonComponent, {
                environmentInjector: this.injector,
                hostElement: mountPoint as HTMLElement
            });

            // Set Inputs
            componentRef.instance.source = source;
            componentRef.instance.index = index;

            // Trigger Change Detection for the new component so it renders immediately
            this.appRef.attachView(componentRef.hostView);
            componentRef.changeDetectorRef.detectChanges();

            this.componentRefs.push(componentRef);
        }
    });
  }
}