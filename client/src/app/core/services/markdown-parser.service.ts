import { Injectable } from '@angular/core';

// Define exported types for block content
export type CodeContent = { language: string; code: string };
export type TableContent = { headers: string[]; rows: any[]; title?: string };

// --- MODIFIED: Define specific block types ---
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

// --- MODIFIED: Use a discriminated union ---
export type ContentBlock = TextBlock | TableBlock | CodeBlock;

@Injectable({ providedIn: 'root' })
export class MarkdownParserService {
  constructor() {}

  /**
   * Parse raw AI text into blocks:
   * - code blocks: fenced with ```
   * - table blocks: contiguous markdown table lines starting with '|'
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
    let inTableBlock = false; // New flag to track table state
    let currentLanguage = 'plaintext';

    const flushText = () => {
      if (textBuffer.length) {
        const content = textBuffer.join('\n').trim();
        if (content) {
          blocks.push({ type: 'text', content });
        }
        textBuffer = [];
      }
    };

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

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const isTableLine = line.startsWith('|'); // Basic check for table row
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
      // Check if this line looks like part of a table
      if (isTableLine) {
        // If we weren't in a table, this might be the start. Flush text.
        if (!inTableBlock) {
           flushText();
           inTableBlock = true;
        }
        tableBuffer.push(line);
      } 
      else {
        // 3. Handle Text
        // If we were in a table but hit a non-table line, the table ended.
        if (inTableBlock) {
          flushTable();
        }
        
        // Don't push purely empty lines if buffer is empty to avoid gaps at start
        if (rawLine.trim() !== '' || textBuffer.length > 0) {
          textBuffer.push(rawLine);
        }
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
    // keep only lines that look like table rows
    const lines = markdown
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|'));
    
    // A valid table needs at least 2 lines (Header + Separator)
    if (lines.length < 2) return null;

    // find header and separator lines
    // Logic: The separator line |---| usually comes second.
    // If lines[1] is a separator, then lines[0] is the header.
    
    const separatorRegex = /^\|?[\s-:|]+\|?$/; // Matches |---| or | :--- |
    
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
    
    // headers
    const headers = headerLine
      .split('|')
      .map((h) => h.replace(/\*\*/g, '').trim()) // Clean bold syntax
      .filter(Boolean);
      
    if (headers.length === 0) return null;
    const columnCount = headers.length;

    // collect cell values after separator
    const dataLines = lines.slice(sepLineIndex + 1);
    if (!dataLines.length) return null;

    // join and split to handle concatenated/streamed rows robustly
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
    
    // Allow empty rows if the table structure is valid but empty
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