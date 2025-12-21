import { Injectable } from '@angular/core';

// Define exported types for block content
export type CodeContent = { language: string; code: string };
export type TableContent = { headers: string[]; rows: any[]; title?: string };

// --- Block Types ---
export type TextBlock = {
  type: 'text';
  content: string;
};

export type TableBlock = {
  type: 'table';
  content: TableContent;
};

export type CodeBlock = {
  type: 'code';
  content: CodeContent;
};

// NEW: Explicit Image Block Type
export type ImageBlock = {
  type: 'image_url';
  content: string; // The URL
};

// Export the Union Type
export type ContentBlock = TextBlock | TableBlock | CodeBlock | ImageBlock;

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
  constructor() {}

  /**
   * Parse raw AI text into blocks:
   * - code blocks: fenced with ```
   * - table blocks: contiguous markdown table lines starting with '|'
   * - image blocks: standalone markdown images or image URLs
   * - text blocks: everything else
   */
  parse(text: string | undefined): ContentBlock[] {
    if (!text) return [];

    // Normalize weird pipe concatenations from streaming
    const normalized = text.replace(/\|\|/g, '\n|').replace(/\r\n/g, '\n');

    const lines = normalized.split('\n');

    const blocks: ContentBlock[] = [];
    let textBuffer: string[] = [];
    let tableBuffer: string[] = [];
    let codeBuffer: string[] = [];

    let inCodeBlock = false;
    let inTableBlock = false;
    let currentLanguage = 'plaintext';

    // Helper: Flush Text Buffer
    const flushText = () => {
      if (textBuffer.length) {
        const content = textBuffer.join('\n').trim();
        if (content) {
          blocks.push({ type: 'text', content });
        }
        textBuffer = [];
      }
    };

    // Helper: Flush Table Buffer
    const flushTable = () => {
      if (tableBuffer.length) {
        const tableMarkdown = tableBuffer.join('\n').trim();
        const parsed = this.parseTable(tableMarkdown);
        if (parsed) {
          blocks.push({ type: 'table', content: parsed });
        } else {
          // If parsing fails (e.g. incomplete table), treat it as text
          textBuffer.push(...tableBuffer);
        }
        tableBuffer = [];
        inTableBlock = false;
      }
    };

    // Helper: Flush Code Buffer
    const flushCode = () => {
      if (codeBuffer.length || inCodeBlock) {
        blocks.push({
          type: 'code',
          content: {
            language: currentLanguage,
            code: codeBuffer.join('\n'), 
          },
        });
        codeBuffer = [];
        inCodeBlock = false;
        currentLanguage = 'plaintext';
      }
    };

    // --- Regex patterns for Images ---
    // Matches: ![Alt text](https://example.com/img.png)
    const mdImageRegex = /^!\[.*?\]\((.*?)\)$/;
    // Matches: [https://example.com/img.png](https://example.com/img.png) (on its own line)
    const rawImageRegex = /^https?:\/\/.*\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const isTableLine = line.startsWith('|');
      const isCodeFence = line.startsWith('```');

      // 1. Handle Code Blocks
      if (inCodeBlock) {
        if (isCodeFence) {
          flushCode(); // End of code block
        } else {
          codeBuffer.push(rawLine);
        }
        continue;
      }

      if (isCodeFence) {
        // Start of new code block -> Flush previous buffers
        flushTable();
        flushText();
        inCodeBlock = true;
        currentLanguage = line.substring(3).trim().toLowerCase() || 'plaintext';
        continue;
      }

      // 2. Handle Tables
      if (isTableLine) {
        if (!inTableBlock) {
           flushText();
           inTableBlock = true;
        }
        tableBuffer.push(line);
        continue; 
      } 
      else if (inTableBlock) {
        flushTable();
      }

      // 3. Handle Images (NEW LOGIC)
      // If a line is explicitly an image (markdown syntax or raw URL), make it an image block
      const mdImageMatch = line.match(mdImageRegex);
      const isRawImage = rawImageRegex.test(line);

      if (mdImageMatch || isRawImage) {
        flushText(); // Flush any text before this image
        
        let imageUrl = '';
        if (mdImageMatch) {
          imageUrl = mdImageMatch[1]; // Extract URL from parenthesis
        } else {
          imageUrl = line; // Use raw URL
        }

        blocks.push({ type: 'image_url', content: imageUrl });
        continue;
      }

      // 4. Handle Text
      // Don't push purely empty lines if buffer is empty to avoid gaps at start
      if (rawLine.trim() !== '' || textBuffer.length > 0) {
        textBuffer.push(rawLine);
      }
    }

    // End-of-input flush
    flushTable();
    flushText();
    flushCode(); 

    // Filter out empty blocks
    return blocks.filter((block) => {
      if (block.type === 'text' && !block.content) return false;
      return true;
    });
  }

  /**
   * Parse a markdown table (simple). Returns { headers, rows, title? } or null.
   */
  private parseTable(markdown: string): TableContent | null {
    const lines = markdown
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|'));
    
    if (lines.length < 2) return null;

    const separatorRegex = /^\|?[\s-:|]+\|?$/; 
    
    let headerIndex = -1;
    let sepLineIndex = -1;

    for (let i = 0; i < lines.length - 1; i++) {
        if (separatorRegex.test(lines[i+1])) {
            headerIndex = i;
            sepLineIndex = i + 1;
            break;
        }
    }

    if (headerIndex === -1) return null;

    const headerLine = lines[headerIndex];
    const headers = headerLine
      .split('|')
      .map((h) => h.replace(/\*\*/g, '').trim()) 
      .filter(Boolean);
      
    if (headers.length === 0) return null;
    const columnCount = headers.length;

    const dataLines = lines.slice(sepLineIndex + 1);
    if (!dataLines.length) return null;

    const allCells = dataLines
      .join('|')
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);

    const rows: string[][] = [];
    for (let i = 0; i < allCells.length; i += columnCount) {
      const slice = allCells.slice(i, i + columnCount);
      if (slice.length === columnCount) rows.push(slice);
    }
    
    if (!rows.length && dataLines.length > 0) return null; 

    const formattedRows = rows.map((r) =>
      headers.reduce((acc, h, i) => {
        acc[h] = r[i] ?? '';
        return acc;
      }, {} as any)
    );

    return { headers, rows: formattedRows };
  }
}