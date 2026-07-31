import * as pdfjsLib from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// Configures the PDF.js worker locally using Vite's ESM asset bundling resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Type guard to check if a TextItem or TextMarkedContent item is a TextItem.
 */
function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item;
}

/**
 * Extracts raw text from a PDF file while preserving layout structure by grouping
 * text items that fall on the same horizontal line.
 *
 * @param file The PDF File object to process.
 * @returns A promise resolving to the extracted multiline text string.
 */
export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Filter valid text items and group by Y-coordinate matrix position to retain row structure
    const linesMap = new Map<number, TextItem[]>();

    for (const item of textContent.items) {
      if (!isTextItem(item) || !item.str.trim()) continue;

      // Y-coordinate in transform matrix (transform[5])
      const y = Math.round(item.transform[5]);

      if (!linesMap.has(y)) {
        linesMap.set(y, []);
      }
      linesMap.get(y)!.push(item);
    }

    // Sort Y-coordinates in descending order (top of page to bottom)
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

    const pageLines: string[] = [];

    for (const y of sortedY) {
      const lineItems = linesMap.get(y)!;

      // Sort items on the same line by X-coordinate (transform[4])
      lineItems.sort((a, b) => a.transform[4] - b.transform[4]);

      const lineText = lineItems.map((item) => item.str).join(' ');
      pageLines.push(lineText);
    }

    fullText += pageLines.join('\n') + '\n';
  }

  return fullText.trim();
}