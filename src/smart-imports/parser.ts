import { ParsedProduct } from './types';
import { normalizeFields } from './fieldNormalizer';

/**
 * Normalizes common OCR artifacts in numerical or date strings.
 */
function fixOcrMistakes(text: string): string {
  return text
    .replace(/(?<=\d)[O|o](?=\d)/g, '0')
    .replace(/(?<=\d)[I|l](?=\d)/g, '1')
    .replace(/(?<=\d)[S|s](?=\d)/g, '5')
    .replace(/(?<=\d)[B](?=\d)/g, '8');
}

/**
 * Cleans leading row index numbers or bullet prefixes from product names
 * (e.g. "2 Ambuja Cement 53 Grade" -> "Ambuja Cement 53 Grade").
 */
function stripLeadingRowIndex(name: string): string {
  if (!name) return '';
  return name.replace(/^\d+[\.\)\s\-]+(?=[A-Za-z])/, '').trim();
}

/**
 * Parses pipe-delimited or structured reconstructed invoice rows into `ParsedProduct` objects
 * utilizing centralized normalized fields from fieldNormalizer.
 *
 * @param lines Array of reconstructed row strings from tableReconstructor.
 * @returns Array of ParsedProduct objects.
 */
export function parseInvoiceLines(lines: string[]): ParsedProduct[] {
  const parsedProducts: ParsedProduct[] = [];

  const skipKeywords = [
    'INVOICE NO', 'BILL NO', 'INVOICE NUMBER', 'BILL NUMBER',
    'GST SUMMARY', 'TAX SUMMARY', 'CGST', 'SGST', 'IGST', 'CESS',
    'GRAND TOTAL', 'NET TOTAL', 'SUB TOTAL', 'TOTAL AMOUNT', 'ROUND OFF',
    'DISCOUNT', 'ADDRESS', 'PHONE', 'MOBILE', 'TEL', 'EMAIL',
    'BANK DETAILS', 'ACCOUNT NO', 'IFSC', 'UPI', 'QR CODE',
    'TERMS & CONDITIONS', 'TERMS AND CONDITIONS', 'SIGNATURE',
    'AUTHORIZED SIGNATORY', 'THANK YOU', 'VISIT AGAIN', 'PAGE '
  ];

  const headerLabels = [
    'product', 'product name', 'item', 'description', 'name', 'productname', 'particulars'
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    try {
      const originalLine = lines[idx];
      const trimmedLine = originalLine.trim();
      if (!trimmedLine) continue;

      const upperLine = trimmedLine.toUpperCase();
      const shouldSkip = skipKeywords.some(keyword => upperLine.includes(keyword));
      if (shouldSkip) continue;

      const correctedLine = fixOcrMistakes(trimmedLine);

      // Check if line is pipe-delimited structured output from tableReconstructor
      if (correctedLine.includes('|')) {
        const columns = correctedLine.split('|').map(col => col.trim());
        if (columns.length === 0) continue;

        // Request normalized canonical fields from fieldNormalizer
        const normalized = normalizeFields(columns);

        let rawProductName = normalized.productName || columns[0] || '';
        rawProductName = stripLeadingRowIndex(rawProductName);

        // Discard row completely if productName equals standard header labels
        if (headerLabels.includes(rawProductName.toLowerCase())) {
          continue;
        }

        const quantity = normalized.quantity !== null && normalized.quantity !== undefined && String(normalized.quantity).trim() !== ''
          ? parseFloat(String(normalized.quantity))
          : null;

        const costPrice = normalized.purchasePrice !== null && normalized.purchasePrice !== undefined && String(normalized.purchasePrice).trim() !== ''
          ? parseFloat(String(normalized.purchasePrice))
          : null;

        // Never copy purchasePrice into MRP. If MRP is missing, leave it null.
        const mrp = normalized.mrp !== null && normalized.mrp !== undefined && String(normalized.mrp).trim() !== ''
          ? parseFloat(String(normalized.mrp))
          : null;

        const gstPercent = normalized.gst !== null && normalized.gst !== undefined && String(normalized.gst).trim() !== ''
          ? parseFloat(String(normalized.gst).replace(/%/g, '').trim())
          : null;

        const hsnCode = normalized.hsn || null;
        const barcode = normalized.barcode || null;
        const batchNumber = normalized.batch || null;
        const expiryDate = normalized.expiry || null;
        const unit = normalized.unit || null;

        if (!rawProductName && quantity === null && costPrice === null) {
          continue;
        }

        const parsedProduct: ParsedProduct = {
          name: rawProductName || null,
          quantity: isNaN(quantity as number) ? null : quantity,
          mrp: isNaN(mrp as number) ? null : mrp,
          costPrice: isNaN(costPrice as number) ? null : costPrice,
          expiry: expiryDate || null,
          batch: batchNumber || null,
          manufacturer: null,
          rawText: originalLine,
          barcode: barcode || null,
          sku: null,
          gstRate: isNaN(gstPercent as number) ? null : gstPercent,
          gstSlab: gstPercent !== null && !isNaN(gstPercent) ? `${gstPercent}%` : null,
          gstPercent: isNaN(gstPercent as number) ? null : gstPercent,
          hsnCode: hsnCode || null,
          weight: null,
          unit: unit || null,
          confidence: 100,
          manufacturingDate: null,
          mfgDate: null
        };

        parsedProducts.push(parsedProduct);
        continue;
      }

      // Fallback unformatted string parser
      let cleanedName = stripLeadingRowIndex(correctedLine);
      if (headerLabels.includes(cleanedName.toLowerCase())) {
        continue;
      }

      const parsedProduct: ParsedProduct = {
        name: cleanedName || null,
        quantity: null,
        mrp: null,
        costPrice: null,
        expiry: null,
        batch: null,
        manufacturer: null,
        rawText: originalLine,
        barcode: null,
        sku: null,
        gstRate: null,
        gstSlab: null,
        gstPercent: null,
        hsnCode: null,
        weight: null,
        unit: null,
        confidence: 100,
        manufacturingDate: null,
        mfgDate: null
      };

      parsedProducts.push(parsedProduct);

    } catch (error) {
      console.error('Error parsing line:', error);
    }
  }

  return parsedProducts;
}