import { 
  Component, 
  Input, 
  OnChanges, 
  SimpleChanges, 
  ElementRef, 
  ViewEncapsulation, 
  inject,
  SecurityContext,
  ApplicationRef,
  OnDestroy,
  EnvironmentInjector,
  createComponent,
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
  encapsulation: ViewEncapsulation.None, // Vital for styles to apply to innerHTML
  styles: [`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in-block { animation: fadeIn 0.3s ease-out forwards; }
    
    /* CITATION CHIP STYLING */
    .citation-mount-point { display: inline-block; vertical-align: middle; }
    
    .citation-chip {
      display: inline-flex; align-items: center; justify-content: center;
      margin: 0 2px; padding: 0px 6px; height: 18px;
      border-radius: 9px; 
      background-color: #e3e8ee; color: #4b5563;
      font-size: 0.7rem; font-weight: 600; font-family: monospace;
      cursor: pointer; transition: all 0.2s ease;
      user-select: none;
    }
    .citation-chip:hover { background-color: #d1d9e2; color: #1f2937; transform: translateY(-1px); }
    
    @media (prefers-color-scheme: dark) {
      .citation-chip { background-color: #374151; color: #e5e7eb; }
      .citation-chip:hover { background-color: #4b5563; color: #ffffff; }
    }
  `]
})
export class StreamingTextComponent implements OnChanges, OnDestroy {
  @Input() content = ''; 
  @Input() sources: Source[] = [];
  
  private elementRef = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private markedInstance = new Marked();
  
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
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs = [];
  }

  private render() {
    // 1. Parse Markdown to HTML
    let rawHtml = this.markedInstance.parse(this.content || '') as string;
    
    // 2. Inject Mount Points for Citations
    // Replaces [1] with <span class="citation-mount-point idx-0"></span>
    if (this.sources && this.sources.length > 0) {
        rawHtml = rawHtml.replace(/\[(\d+)\]/g, (match, digits) => {
            const index = parseInt(digits, 10) - 1; 
            if (this.sources[index]) {
                return `<span class="citation-mount-point idx-${index}"></span>`;
            }
            return match;
        });
    }

    // 3. Sanitize
    const cleanHtml = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) || '';
    
    // 4. Update DOM
    // Note: We do a full re-render here to ensure citations are placed correctly. 
    // Optimization: Diffing DOM nodes is complex with citations; replacement is safer for accuracy.
    this.destroyComponents();
    this.elementRef.nativeElement.innerHTML = cleanHtml;
    
    // 5. Mount Components into placeholders
    this.mountCitations(); 
  }

  private mountCitations() {
    const root = this.elementRef.nativeElement;
    const mountPoints = root.querySelectorAll('.citation-mount-point');
    
    mountPoints.forEach((mountPoint: HTMLElement) => {
        // Extract index from class (e.g. idx-2)
        const match = mountPoint.className.match(/idx-(\d+)/);
        if (!match) return;
        
        const index = parseInt(match[1], 10);
        const source = this.sources[index];

        if (source) {
            // Create the Angular Component dynamically
            const componentRef = createComponent(CitationButtonComponent, {
                environmentInjector: this.injector,
                hostElement: mountPoint
            });

            // Pass Data
            componentRef.instance.source = source;
            componentRef.instance.index = index + 1; // Display [1] not [0]

            // Attach & Detect Changes
            this.appRef.attachView(componentRef.hostView);
            componentRef.changeDetectorRef.detectChanges();
            
            this.componentRefs.push(componentRef);
        }
    });
  }
}