import { createWorker } from 'tesseract.js';

/**
 * Extracts and cleans text from an image file using Tesseract.js.
 * Preserves structural line breaks while normalizing spaces inside each line, 
 * trimming trailing whitespaces, and eliminating redundant empty lines.
 * @param file - The image file to process.
 * @returns A promise that resolves to the cleaned multiline text string.
 */
export async function extractText(file: File): Promise<string> {
  const worker = await createWorker('eng');
  
  try {
    const imageUrl = URL.createObjectURL(file);
    const { data: { text } } = await worker.recognize(imageUrl);
    URL.revokeObjectURL(imageUrl);

    // Standardize newline anomalies across platforms
    const normalizedNewlines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Process each line independently to preserve structural vertical formatting layout
    const cleanedLines = normalizedNewlines
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim()) // Normalize horizontal spaces inside line
      .filter(line => line.length > 0); // Remove empty or repeated blank lines

    // Join with exactly one newline separating rows
    return cleanedLines.join('\n');
  } finally {
    await worker.terminate();
  }
}

/**
 * Checks if the extracted text is likely to be an invoice based on keywords.
 * Returns true if the text contains at least three unique matching keywords.
 * @param text - The cleaned OCR text to analyze.
 * @returns A boolean indicating if the text matches invoice criteria.
 */
export function isInvoiceLikely(text: string): boolean {
  const keywords: string[] = [
    'MRP',
    'Batch',
    'Expiry',
    'Qty',
    'GST',
    'Invoice',
    'Total',
    'Amount',
    'Rate',
    'PCS',
    'Nos'
  ];

  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
      if (matchCount >= 3) {
        return true;
      }
    }
  }

  return false;
}