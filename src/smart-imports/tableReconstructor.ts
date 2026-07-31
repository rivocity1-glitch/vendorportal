/**
 * Interface representing spatial bounding text tokens derived from PDF matrix layout or OCR lines.
 */
interface TextToken {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Interface representing a structured invoice row object.
 */
export interface StructuredRow {
  Product?: string;
  HSN?: string;
  Qty?: string;
  Unit?: string;
  Rate?: string;
  Amount?: string;
  [key: string]: string | undefined;
}

/**
 * Normalizes input text into spatial tokens if coordinate markers exist,
 * or parses inline text layouts to synthesize horizontal matrix tokens.
 */
function parseTokensFromText(rawText: string): TextToken[] {
  const lines = rawText.split('\n');
  const tokens: TextToken[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect structural spatial coordinate markers if present in raw payload format [x,y,text]
    const coordMatch = trimmed.match(/^\[(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (coordMatch) {
      tokens.push({
        x: parseFloat(coordMatch[1]),
        y: parseFloat(coordMatch[2]),
        text: coordMatch[3].trim(),
      });
    } else {
      tokens.push({
        x: 0,
        y: lineIndex * 20, // Simulated Y line distance
        text: trimmed,
      });
    }
  });

  return tokens;
}

/**
 * Identifies if a line is a table header row or standalone column label.
 */
function isTableHeader(lineText: string): boolean {
  const upper = lineText.toUpperCase().trim();
  
  const headerKeywords = [
    'ITEM', 'DESCRIPTION', 'PRODUCT', 'PARTICULARS', 'ITEMS',
    'HSN', 'SAC', 'QTY', 'QUANTITY', 'RATE', 'PRICE', 'AMOUNT', 'DISC', 'TAX', 'S.NO', 'SL.NO', 'CODE'
  ];

  const words = upper.split(/\s+/);
  
  if (words.length === 1 && headerKeywords.includes(words[0])) {
    return true;
  }

  let matches = 0;
  for (const kw of headerKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(upper)) {
      matches++;
    }
  }

  return matches >= 2;
}

/**
 * Identifies if a line signals the beginning of totals/summary sections or footers.
 */
function isTableFooterOrTotal(lineText: string): boolean {
  const upper = lineText.toUpperCase();
  const stopKeywords = [
    'SUBTOTAL', 'SUB TOTAL', 'CGST', 'SGST', 'IGST', 'CESS',
    'TAXABLE VALUE', 'TOTAL TAX', 'GRAND TOTAL', 'NET TOTAL',
    'NET AMOUNT', 'TOTAL AMOUNT', 'ROUND OFF', 'AMOUNT PAYABLE',
    'BAL DUE', 'BALANCE DUE', 'TERMS & CONDITIONS', 'THANK YOU',
    'AUTHORIZED SIGNATORY', 'BANK DETAILS'
  ];

  return stopKeywords.some(kw => upper.includes(kw));
}

/**
 * Checks if a string line consists of vendor/customer metadata, company names, addresses, dates, or invoice metadata.
 */
function isMetadataOrHeader(lineText: string): boolean {
  const upper = lineText.toUpperCase();
  
  const metadataKeywords = [
    'TAX INVOICE', 'INVOICE', 'BILL OF SUPPLY', 'CASH MEMO', 'M/S',
    'BILL TO', 'SHIP TO', 'VENDOR', 'CUSTOMER', 'PLOT NO', 'PVT', 'LTD', 'CO.',
    'TRADING CO', 'CONSTRUCTION CO', 'MIDC', 'ROAD', 'STREET', 'CITY', 'STATE', 'PINCODE', 
    'GSTIN', 'INVOICE NO', 'BILL NO', 'DATE', 'DATED', 'PHONE', 'MOBILE', 'TEL', 'EMAIL',
    'STATE CODE', 'PAN NO', 'CIN NO', 'HSN/SAC'
  ];

  if (metadataKeywords.some(kw => upper.includes(kw))) {
    return true;
  }

  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const gstinPattern = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/;

  return phonePattern.test(lineText) || emailPattern.test(lineText) || gstinPattern.test(lineText);
}

/**
 * Parses a raw line string into a structured row object following specific product invoice rules.
 */
function parseLineToStructuredRow(line: string): StructuredRow {
  const cleanedLine = line.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleanedLine.split(' ');

  const structured: StructuredRow = {};

  const knownUnits = [
    'box', 'pcs', 'bag', 'kg', 'gm', 'ml', 'ltr', 'strip', 'bottle', 'tube', 'pack', 'vial', 'tablet', 'capsule'
  ];

  let hsnIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    // HSN: 4-8 digit numeric code
    if (/^\d{4,8}$/.test(tokens[i])) {
      hsnIndex = i;
      break;
    }
  }

  if (hsnIndex !== -1) {
    structured.Product = tokens.slice(0, hsnIndex).join(' ').trim();
    structured.HSN = tokens[hsnIndex];

    let cursor = hsnIndex + 1;
    // Qty: Numeric value immediately after HSN
    if (cursor < tokens.length && /^\d+(?:\.\d+)?$/.test(tokens[cursor])) {
      structured.Qty = tokens[cursor];
      cursor++;
    }

    // Unit: Unit string after Qty
    if (cursor < tokens.length && knownUnits.includes(tokens[cursor].toLowerCase())) {
      structured.Unit = tokens[cursor].toLowerCase();
      cursor++;
    }

    // Rate: Numeric value after Unit
    if (cursor < tokens.length && /^\d+(?:\.\d+)?$/.test(tokens[cursor])) {
      structured.Rate = tokens[cursor];
      cursor++;
    }

    // Amount: Last numeric value
    const remainingNumerics: { index: number; val: string }[] = [];
    for (let j = cursor; j < tokens.length; j++) {
      if (/^\d+(?:\.\d+)?$/.test(tokens[j])) {
        remainingNumerics.push({ index: j, val: tokens[j] });
      }
    }

    if (remainingNumerics.length > 0) {
      structured.Amount = remainingNumerics[remainingNumerics.length - 1].val;
    }
  } else {
    // Fallback if no HSN found: Assign whole text to product if confidence low
    structured.Product = cleanedLine;
  }

  return structured;
}

/**
 * Reconstructs raw OCR text or native PDF text into clean, structured table row objects preserving every detected column.
 *
 * @param fullText Raw extracted string from OCR or PDF text layer.
 * @returns Array of structured row objects.
 */
export function reconstructInvoiceTable(fullText: string): StructuredRow[] {
  if (!fullText || !fullText.trim()) {
    return [];
  }

  const tokens = parseTokensFromText(fullText);
  if (tokens.length === 0) {
    return [];
  }

  const hasCoordinates = tokens.some(t => t.x > 0);
  let rawLines: string[] = [];

  if (hasCoordinates) {
    const Y_TOLERANCE = 8;
    const rowClusters: { y: number; tokens: TextToken[] }[] = [];

    tokens.forEach((token) => {
      const matchedCluster = rowClusters.find(
        (cluster) => Math.abs(cluster.y - token.y) <= Y_TOLERANCE
      );

      if (matchedCluster) {
        matchedCluster.tokens.push(token);
      } else {
        rowClusters.push({ y: token.y, tokens: [token] });
      }
    });

    rowClusters.sort((a, b) => a.y - b.y);

    rawLines = rowClusters.map((cluster) => {
      cluster.tokens.sort((a, b) => a.x - b.x);
      return cluster.tokens.map((t) => t.text).join(' | ');
    });
  } else {
    rawLines = fullText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  let headerFound = false;
  let tableFooterReached = false;
  const structuredRows: StructuredRow[] = [];

  for (const line of rawLines) {
    if (!headerFound) {
      if (isTableHeader(line)) {
        headerFound = true;
      }
      continue;
    }

    if (isTableFooterOrTotal(line)) {
      tableFooterReached = true;
      break;
    }

    if (!isMetadataOrHeader(line) && !isTableHeader(line) && line.length > 0) {
      const structured = parseLineToStructuredRow(line);
      if (structured.Product) {
        structuredRows.push(structured);
      }
    }
  }

  // If no explicit table header was found via keyword detection, fallback to parsing all non-metadata lines
  if (structuredRows.length === 0 && !headerFound) {
    for (const line of rawLines) {
      if (!isMetadataOrHeader(line) && !isTableHeader(line) && !isTableFooterOrTotal(line) && line.length > 0) {
        const structured = parseLineToStructuredRow(line);
        if (structured.Product) {
          structuredRows.push(structured);
        }
      }
    }
  }

  return structuredRows;
}