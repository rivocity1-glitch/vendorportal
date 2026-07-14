import { ParsedProduct } from './types';

/**
 * Parses individual invoice text lines into structured product models.
 * Filters out financial summaries, transactional boilerplate, and structural metadata
 * while extracting quantitative properties (quantity, price, metrics) from item rows.
 * * @param lines Array of structural text rows passed down from the template pipeline.
 * @returns Array of ParsedProduct payloads representing valid inventory entries.
 */
export function parseInvoiceLines(lines: string[]): ParsedProduct[] {
  const parsedProducts: ParsedProduct[] = [];

  const skipKeywords = [
    'CGST', 'SGST', 'IGST', 'CESS', 'TOTAL', 'ROUND OFF', 
    'SALE @', 'GST', 'TAX', 'AMOUNT IN WORDS', 'BANK', 
    'ACCOUNT', 'IFSC', 'SIGNATURE', 'TERMS', 'THANK YOU'
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const upperLine = trimmedLine.toUpperCase();

    // 1. Instantly skip lines containing summary keywords or financial declarations
    const shouldSkip = skipKeywords.some(keyword => upperLine.includes(keyword));
    if (shouldSkip) {
      console.log("SKIPPED:", line);
      continue;
    }

    // 2. Tokenize line and target regular data layout sequences
    const tokens = trimmedLine.split(/\s+/);
    if (tokens.length < 3) {
      console.log("SKIPPED:", line);
      continue;
    }

    // Check if the row initializes with a numeric sequence index (serial identifier marker)
    let startIndex = 0;
    if (/^\d+$/.test(tokens[0])) {
      startIndex = 1; // Step past the index token boundary layout
    }

    // Collect continuous alphabetic string sequences forming the item description
    const nameTokens: string[] = [];
    let currentIdx = startIndex;

    while (currentIdx < tokens.length) {
      const token = tokens[currentIdx];
      // A typical numeric tracking tail starts when purely quantitative values are hit
      // We check if it's a number (allowing decimals) or an HSN code block descriptor
      if (/^\d+(\.\d+)?%?$/.test(token) && nameTokens.length > 0) {
        break;
      }
      nameTokens.push(token);
      currentIdx++;
    }

    // Capture the remainder trailing indices containing quantitative financial values
    const valueTokens = tokens.slice(currentIdx);

    // Ensure we collected a description layout and have quantitative indices to parse out
    if (nameTokens.length === 0 || valueTokens.length < 2) {
      console.log("SKIPPED:", line);
      continue;
    }

    const productName = nameTokens.join(' ');

    // Extract numerical entries out from unit descriptors (e.g., "Bags", "Pcs")
    const numericValues: number[] = [];
    for (const valToken of valueTokens) {
      const cleanVal = valToken.replace(/%/g, '');
      if (/^\d+(\.\d+)?$/.test(cleanVal)) {
        numericValues.push(parseFloat(cleanVal));
      }
    }

    // Validation guard: a product entry needs structural quantitative definitions (Qty, Rate/Price, GST)
    if (numericValues.length < 2) {
      console.log("SKIPPED:", line);
      continue;
    }

    /**
     * Parse row values based on standard visual item sequence metrics:
     * If an HSN mapping exists, numeric values index shifts accordingly:
     * Expected layout format: [HSN] -> Qty -> [Unit Text Descriptor] -> Rate/Cost -> GST -> Total Amount
     */
    let quantity = 0;
    let costPrice = 0;

    if (numericValues.length >= 4) {
      // Structure contains HSN matching index at position 0
      quantity = numericValues[1];
      costPrice = numericValues[2];
    } else {
      // Standard item row: Qty -> Rate/Cost (+ optional extra numeric values)
      quantity = numericValues[0];
      costPrice = numericValues[1];
    }

    const parsedProduct: ParsedProduct = {
      name: productName,
      quantity: quantity,
      costPrice: costPrice,
      mrp: costPrice, // Fallback profile map configuration to avoid critical layout failure flags
      batch: null,
      expiry: null,
      manufacturer: null,
      rawText: ''
    };

    console.log("PRODUCT:", parsedProduct);
    parsedProducts.push(parsedProduct);
  }

  return parsedProducts;
}