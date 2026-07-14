import * as pdfjsLib from 'pdfjs-dist';

// Configures the PDF.js worker locally for a Vite environment using standard ESM asset resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts individual positioned text items from a PDF file using pdfjs-dist,
 * clusters them into logical visual rows based on their shared Y coordinates, 
 * orders them horizontally, and joins them to preserve a clean structural line layout.
 * * @param file The PDF document file object.
 * @returns A promise that resolves to the reconstructed multiline text string of the PDF.
 */
export async function extractPdfText(file: File): Promise<string> {
  if (!file) {
    throw new Error('Text extraction aborted: No file payload provided.');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const items: PdfTextItem[] = [];

    // 1. Gather all individual text items across all document pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      for (const item of textContent.items) {
        if ('str' in item && 'transform' in item) {
          items.push({
            text: item.str,
            x: item.transform[4],      // X-coordinate translation property
            y: item.transform[5],      // Y-coordinate translation property
            width: item.width,
            height: item.height,
          });
        }
      }
    }

    // 2. Cluster text items by unique visual rows based on Y coordinate matching proximity
    const rowTolerance = 5; // Variance threshold allowance for text tokens residing on the same visual line
    const clusteredRows: PdfTextItem[][] = [];

    for (const item of items) {
      // Find an existing line cluster segment matching the current item's vertical canvas position
      let matchedRow = clusteredRows.find(row => Math.abs(row[0].y - item.y) <= rowTolerance);

      if (matchedRow) {
        matchedRow.push(item);
      } else {
        clusteredRows.push([item]);
      }
    }

    // 3. Sort visual row coordinates vertically from top to bottom (Higher Y value indicates higher position in canvas)
    clusteredRows.sort((a, b) => b[0].y - a[0].y);

    // 4. Sort columns horizontally by X order, map text tokens, and join them with spaces
    const rows: string[] = clusteredRows.map(row => {
      row.sort((a, b) => a.x - b.x);
      return row.map(item => item.text).join(' ');
    });

    console.log("Rows:", rows);

    // 5. Unify line elements cleanly using break boundaries
    return rows.join("\n");
  } catch (error: any) {
    throw new Error(`Failed to extract layout-preserved text matrix from PDF: ${error?.message || error}`);
  }
}