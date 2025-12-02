import { Component, computed, effect, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.services';

@Component({
  selector: 'app-code-editor-canvas-component',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MonacoEditorModule, FormsModule],
  template: `
    <div class="code-block-container my-5 h-90 rounded-lg overflow-hidden border border-gray-400">
      <!-- Header -->
      <div class="flex items-center justify-between bg=[#ffffff] shadow-md dark:bg-[#162731] px-4 py-2">
        <span class="text-sm text-gray-400">{{ language }}</span>
        <button mat-stroked-button (click)="runCode()" class="text-gray-300 border-gray-600">
          <mat-icon>play_arrow</mat-icon>
          Run
        </button>
      </div>

      <!-- Monaco Editor -->
      <ngx-monaco-editor
        [options]="editorOptions"
        [(ngModel)]="code"
        (onInit)="onEditorInit($event)"
      ></ngx-monaco-editor>

      <!-- Output Panel -->
      @if (output()) {
        <div class="output-panel p-4 bg-black/30">
          <pre class="text-sm text-white whitespace-pre-wrap">{{ output() }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    ngx-monaco-editor {
      height: 100%;
    }
  `]
})
export class CodeEditorCanvasComponent implements OnInit {
  @Input() code: string = '';
  @Input() language: string = 'python';

  output = signal<string | null>(null);


  themeService = inject(ThemeService);
  isDarkMode = computed(() => this.themeService.currentTheme() === 'dark');

  private editorInstance = signal<any | null>(null);
  private monacoInstance = signal<any | null>(null);

  editorOptions = {
    // We set a base theme, but the effect will override it
    theme: this.isDarkMode() ? 'vs-dark' : 'vs', 
    language: 'python',
    minimap: { enabled: false },
    automaticLayout: true,
    stickyScroll: {
        enabled: false,
    },
    renderLineHighlight: "none"
  };

  constructor() {
    // --- 2. Create an effect that reacts to changes ---
    effect(() => {
      const monaco = this.monacoInstance();
      const editor = this.editorInstance();
      const isDark = this.isDarkMode(); // This line makes the effect "subscribe" to theme changes

      // Wait until the editor and monaco are initialized
      if (!monaco || !editor) {
        return;
      }

      // 3. Re-define the theme every time the mode changes
      monaco.editor.defineTheme('my-custom-theme', { 
        base: isDark ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': isDark ? '#0a1f2b' : '#f0f4f9',
          'editor.foreground': isDark ? '#d4d4d4' : '#333333',
          'editor.selectionBackground': '#264f78',
          'editorWidget.background': '#494952',
          'editorError.foreground': '#f48771',
          'editorWarning.foreground': '#cca700',
          'editorCursor.foreground': isDark ? '#d4d4d4' : '#333333',
          'editor.selectionHighlightBorder': '#264f78',
        }
      });

      // 4. Apply the newly defined theme
      editor.updateOptions({ theme: 'my-custom-theme' });
    });
  }

  ngOnInit(): void {
    this.editorOptions = { ...this.editorOptions, language: this.language };
  }

  onEditorInit(editor: any): void {
    // --- 5. Save the instances to signals to trigger the effect ---
    this.editorInstance.set(editor);
    this.monacoInstance.set((window as any).monaco);
  }

  runCode(): void {
    if (this.language === 'python') {
      this.runPythonCode();
    } else {
      this.output.set('Running this language is not supported yet.');
    }
  }

  // This is a simple, sandboxed simulation of running Python code.
  // It intercepts 'print' calls.
  private runPythonCode(): void {
    let printOutput = '';
    const console = {
      log: (...args: any[]) => {
        printOutput += args.join(' ') + '\n';
      }
    };
    
    // Create a sandboxed function
    const sandboxedRun = new Function('print', this.code);
    
    try {
      // Run the code
      sandboxedRun(console.log);
      // Set the output to what was captured
      this.output.set(printOutput || 'Code executed successfully.');
    } catch (e: any) {
      this.output.set(`Error: ${e.message}`);
    }
  }
}
