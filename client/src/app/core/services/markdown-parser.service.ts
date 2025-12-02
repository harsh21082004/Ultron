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
    let currentLanguage = 'plaintext';

    const flushText = () => {
      if (textBuffer.length) {
        const content = textBuffer.join('\n').trim();
        if (content) {
          // --- MODIFIED: Push strongly typed block ---
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
          // --- MODIFIED: Push strongly typed block ---
          blocks.push({ type: 'table', content: parsed });
        } else {
          // If parsing fails, treat it as text
          textBuffer.push(...tableBuffer);
        }
        tableBuffer = [];
      }
    };

    const flushCode = () => {
      if (codeBuffer.length || inCodeBlock) {
        // Flush even if buffer is empty if we were in a block
        // --- MODIFIED: Push strongly typed block ---
        blocks.push({
          type: 'code',
          content: {
            language: currentLanguage,
            code: codeBuffer.join('\n'), // Preserve internal indentation/newlines
          },
        });
        codeBuffer = [];
        inCodeBlock = false;
        currentLanguage = 'plaintext';
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const isTableLine = line.startsWith('|');
      const isCodeFence = line.startsWith('```');

      if (inCodeBlock) {
        if (isCodeFence) {
          // End of code block
          flushCode();
        } else {
          // Add line to code buffer
          codeBuffer.push(rawLine); // Use rawLine to preserve indentation
        }
      } else if (isCodeFence) {
        // Start of new code block
        flushText();
        flushTable();
        inCodeBlock = true;
        currentLanguage = line.substring(3).trim().toLowerCase() || 'plaintext';
      } else if (isTableLine) {
        // Table line
        flushText();
        tableBuffer.push(line); // Use trimmed line for table parser
      } else {
        // Text line
        flushTable();
        // Don't push empty lines if textBuffer is empty,
        // but do push them if they are between text (paragraph breaks)
        if (rawLine.trim() !== '' || textBuffer.length > 0) {
          textBuffer.push(rawLine);
        }
      }
    }

    // End-of-input flush
    flushTable();
    flushText();
    flushCode(); // Flush any remaining code block

    // Filter out empty blocks
    return blocks.filter((block) => {
      if (block.type === 'text' && !block.content) return false;
      // All other block types (table, code) are assumed to be valid if they exist
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
    if (lines.length < 2) return null;

    // find header and separator lines
    const headerLine = lines[0];
    const sepLineIndex = lines.findIndex(
      (l) =>
        /\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+/.test(l) || l.includes('---')
    );
    if (sepLineIndex === -1) return null;

    // headers
    const headers = headerLine
      .split('|')
      .map((h) => h.replace(/\*\*/g, '').trim())
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
    if (!rows.length) return null;

    const formattedRows = rows.map((r) =>
      headers.reduce((acc, h, i) => {
        acc[h] = r[i] ?? '';
        return acc;
      }, {} as any)
    );

    return { headers, rows: formattedRows };
  }
}

