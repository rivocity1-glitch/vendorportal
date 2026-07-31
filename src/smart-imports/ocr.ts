import { createWorker, PSM } from 'tesseract.js';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: OcrWord[];
  blocks: OcrBlock[];
}

/**
 * Post-processes extracted OCR text to fix common character substitutions
 * specifically in numerical, date, rate, batch, and percentage contexts.
 */
function correctOcrMistakes(text: string): string {
  if (!text) return '';

  return text
    // Replace O/o with 0 in numeric sequences or price context (e.g. 1O0.0O -> 100.00)
    .replace(/(?<=\d|\b\d{1,4})[O|o](?=\d|\b|\.\d)/g, '0')
    .replace(/(?<=\d\.)[O|o]/g, '0')
    
    // Replace I/l with 1 in numeric sequences (e.g. 1l0 or I20 -> 110 or 120)
    .replace(/(?<=\d)[I|l](?=\d)/g, '1')
    .replace(/(?<=\b)[I|l](?=\d)/g, '1')
    .replace(/(?<=\d)[I|l](?=\b)/g, '1')

    // Fix S/s to 5 in numeric sequences and GST percentages (e.g. 1S% -> 15%)
    .replace(/(?<=\d)[S|s](?=\d|%|\b)/g, '5')
    .replace(/(?<=\b)[S|s](?=\d)/g, '5')

    // Fix B to 8 in numeric sequences
    .replace(/(?<=\d)[B](?=\d)/g, '8')
    
    // Fix GST % formatting variations (e.g. 18 % or 18percent)
    .replace(/(\d+)\s*%\s*(GST|TAX)?/gi, '$1%')
    
    // Fix common space issues in dates (e.g., 12 / 05 / 2024 -> 12/05/2024)
    .replace(/(\d{1,2})\s*[\/\.-]\s*(\d{1,2})\s*[\/\.-]\s*(\d{2,4})/g, '$1/$2/$3');
}

/**
 * Performs enhanced OCR processing on image files with parameters tuned for invoices.
 * Extracts rich metadata including confidence scores, individual words, and structural blocks.
 */
export async function processOcr(file: File): Promise<OcrResult> {
  const worker = await createWorker('eng');

  try {
    // Configure Tesseract parameters for financial/invoice document parsing
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO_OSD,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz./%-$:@#&(), ',
      preserve_interword_spaces: '1',
    });

    const imageUrl = URL.createObjectURL(file);
    const { data } = await worker.recognize(imageUrl);
    URL.revokeObjectURL(imageUrl);

    // Correct OCR artifacts
    const correctedText = correctOcrMistakes(data.text);
    
    // Clean and normalize line formatting
    const cleanedText = correctedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line: string) => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line: string) => line.length > 0)
      .join('\n');

    const words: OcrWord[] = [];
    const blocks: OcrBlock[] = [];

    // Safely extract blocks and traverse hierarchy down to words
    if (data.blocks) {
      for (const block of data.blocks) {
        blocks.push({
          text: correctOcrMistakes(block.text),
          confidence: block.confidence,
          bbox: {
            x0: block.bbox.x0,
            y0: block.bbox.y0,
            x1: block.bbox.x1,
            y1: block.bbox.y1,
          },
        });

        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.lines) {
              for (const line of paragraph.lines) {
                if (line.words) {
                  for (const w of line.words) {
                    words.push({
                      text: correctOcrMistakes(w.text),
                      confidence: w.confidence,
                      bbox: {
                        x0: w.bbox.x0,
                        y0: w.bbox.y0,
                        x1: w.bbox.x1,
                        y1: w.bbox.y1,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      text: cleanedText,
      confidence: data.confidence || 0,
      words,
      blocks,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts and cleans text from an image file using Tesseract.js.
 * Preserves compatibility with existing invoice processing pipeline.
 * @param file - The image file to process.
 * @returns A promise that resolves to the cleaned multiline text string.
 */
export async function extractText(file: File): Promise<string> {
  const result = await processOcr(file);
  return result.text;
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
    'Nos',
    'HSN',
    'SKU',
    'Tax'
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