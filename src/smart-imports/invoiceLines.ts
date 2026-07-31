/**
 * Interface representing structured product row filtering criteria.
 */
export interface ProductLineFilterOptions {
  minTokens?: number;
  requireNumericPrice?: boolean;
}

// Regex patterns targeting invoice boilerplate, headers, footers, addresses, and summary totals
const SKIP_PATTERNS: RegExp[] = [
  // Totals & Summaries
  /\b(GRAND\s+TOTAL|NET\s+TOTAL|SUB\s*TOTAL|TOTAL\s+AMOUNT|BALANCE\s+DUE|ROUND\s*OFF|AMOUNT\s+IN\s+WORDS|TOTAL\s+TAXABLE)\b/i,
  /\b(TOTAL\s+QTY|TOTAL\s+ITEMS|TOTAL\s+PCS|NET\s+PAYABLE|FINAL\s+AMOUNT)\b/i,
  
  // GST & Tax Breakdown Summaries
  /\b(GST\s+SUMMARY|TAX\s+SUMMARY|CGST|SGST|IGST|UTGST|CESS|OUTPUT\s+TAX|INPUT\s+TAX)\b/i,
  /\b(GSTIN|STATE\s+CODE|PAN\s+NO|CIN|LUT\s+NO|TAX\s+INVOICE)\b/i,
  
  // Discounts & Charges
  /\b(SCHEME\s+DISCOUNT|TRADE\s+DISCOUNT|CASH\s+DISCOUNT|DISCOUNT\s+TOTAL|FREIGHT|DELIVERY\s+CHARGES|PACKING\s+CHARGES)\b/i,

  // Invoice & Order Metadata
  /\b(INVOICE\s*(NO|NUMBER|DATE)?|BILL\s*(NO|NUMBER|DATE)?|PO\s*(NO|NUMBER)?|ORDER\s*(NO|DATE)?|DUE\s+DATE)\b/i,
  /\b(CHALLAN\s+NO|E-WAY\s+BILL|VEHICLE\s+NO|DISPATCH\s+THROUGH|PAYMENT\s+MODE|TERMS)\b/i,

  // Contact Details: Phone, Mobile, Email, Address
  /\b(PHONE|MOBILE|TEL|MOB|EMAIL|WEBSITE|FAX)\s*[:#-]?\s*\+?\d+/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(ADDRESS|ROAD|STREET|CITY|DISTRICT|PINCODE|PIN|STATE|NEAR|OPP|BEHIND)\b/i,
  /\b\d{6}\b/, // Standalone 6-digit PIN codes

  // Banking & Payment Details
  /\b(BANK\s+NAME|ACCOUNT\s+NO|A\/C\s+NO|IFSC|SWIFT|BRANCH|UPI\s+ID|QR\s+CODE|PAYTM|GPAY|PHONEPE)\b/i,

  // Table Column Headers
  /^\s*(S\.?NO|SL\.?NO|ITEM|DESCRIPTION|PARTICULARS|PRODUCT|HSN|SAC|QTY|QUANTITY|RATE|PRICE|MRP|AMOUNT|DISC|TAX|GST)\b/i,

  // Footers & Terms
  /\b(TERMS\s*&\s*CONDITIONS|TERMS\s+AND\s+CONDITIONS|THANK\s+YOU|VISIT\s+AGAIN|E\s*&\s*O\.?E)\b/i,
  /\b(AUTHORIZED\s+SIGNATORY|AUTHORISED\s+SIGNATORY|SIGNATURE|SUBJECT\_TO)\b/i,
  /PAGE\s+\d+\s+OF\s+\d+/i
];

// Regex validating the mandatory presence of numeric product metrics (Quantity, Price, Rate, or Amount)
const PRODUCT_ROW_METRIC_PATTERN = /\b\d+(\.\d{1,2})?\b/;

/**
 * Filters out metadata, summary, address, and total lines from extracted text rows,
 * returning only high-confidence product line rows.
 *
 * @param lines Array of structural text line strings from the document.
 * @param options Optional configuration parameters for line filtering.
 * @returns Filtered array containing probable product rows only.
 */
export function filterProductLines(
  lines: string[],
  options: ProductLineFilterOptions = {}
): string[] {
  if (!lines || !Array.isArray(lines)) return [];

  const minTokens = options.minTokens ?? 2;
  const requireNumericPrice = options.requireNumericPrice ?? true;

  const validProductLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 1. Skip rows matching non-product metadata patterns (totals, tax, contact, terms, etc.)
    const isSkipCandidate = SKIP_PATTERNS.some(pattern => pattern.test(trimmedLine));
    if (isSkipCandidate) {
      continue;
    }

    // 2. Ensure line meets minimum token count requirements
    const tokens = trimmedLine.split(/\s+/);
    if (tokens.length < minTokens) {
      continue;
    }

    // 3. Ensure row contains at least one valid price/quantity numeric pattern
    if (requireNumericPrice && !PRODUCT_ROW_METRIC_PATTERN.test(trimmedLine)) {
      continue;
    }

    // 4. Reject standalone phone numbers or long numeric codes without text descriptions
    const pureNumbers = tokens.filter(t => /^\d+$/.test(t));
    if (pureNumbers.length === tokens.length) {
      continue;
    }

    validProductLines.push(trimmedLine);
  }

  console.log(`Filtered ${lines.length} lines down to ${validProductLines.length} product rows.`);
  return validProductLines;
}