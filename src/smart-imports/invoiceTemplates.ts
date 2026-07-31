export interface InvoiceTemplate {
  id: string;
  name: string;
  detect(text: string): boolean;
  parse(text: string): string[];
}

/**
 * Normalizes input text by forcing lowercase and stripping irregular 
 * whitespace layout characters to ensure predictable token keyword matching.
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Checks if the normalized text contains any of the provided alias variations.
 */
function matchAliases(normalizedText: string, aliases: string[]): boolean {
  return aliases.some(alias => normalizedText.includes(alias.toLowerCase()));
}

/**
 * Evaluates template match confidence based on required keywords, optional keywords,
 * and negative penalty keywords to avoid false positive cross-matches.
 */
function calculateConfidenceScore(
  normalizedText: string,
  requiredKeywords: string[],
  optionalKeywords: string[],
  penaltyKeywords: string[] = []
): number {
  let score = 0;

  // Check required primary anchors
  let requiredHits = 0;
  for (const keyword of requiredKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      requiredHits++;
    }
  }

  // Require at least 2 primary structural anchors to proceed
  if (requiredKeywords.length > 0 && requiredHits < 2) {
    return 0;
  }

  score += requiredHits * 2;

  // Evaluate secondary optional features
  for (const keyword of optionalKeywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  // Deduct penalties for conflicting template indicators
  for (const penalty of penaltyKeywords) {
    if (normalizedText.includes(penalty.toLowerCase())) {
      score -= 3;
    }
  }

  return Math.max(0, score);
}

export const invoiceTemplates: InvoiceTemplate[] = [
  {
    id: 'medical-distributor',
    name: 'Medical Distributor Invoice',
    detect(text: string): boolean {
      const normalized = normalizeText(text);
      
      const required = ['batch', 'expiry', 'mrp'];
      const optional = ['ptr', 'pts', 'strip', 'box', 'tab', 'cap', 'dl no', 'drug license', 'mfg date', 'mfr', 'hsn'];
      const penalties = ['bill of supply', 'pos receipt'];

      const score = calculateConfidenceScore(normalized, required, optional, penalties);
      console.log('Template:', 'Medical Distributor Invoice', 'Score:', score);
      return score >= 6;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  },
  {
    id: 'retail-gst',
    name: 'Retail GST Invoice',
    detect(text: string): boolean {
      const normalized = normalizeText(text);

      const required = ['tax invoice', 'gstin'];
      const optional = ['hsn', 'cgst', 'sgst', 'rate', 'qty', 'unit', 'mrp', 'discount', 'net amount'];
      const penalties = ['ptr', 'pts', 'wholesale', 'bill of lading'];

      const score = calculateConfidenceScore(normalized, required, optional, penalties);
      console.log('Template:', 'Retail GST Invoice', 'Score:', score);
      return score >= 5;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  },
  {
    id: 'wholesale-generic',
    name: 'Wholesale Invoice',
    detect(text: string): boolean {
      const normalized = normalizeText(text);

      const required = ['wholesale', 'qty', 'rate'];
      const optional = ['case', 'box', 'carton', 'bag', 'units', 'trade discount', 'hsn/sac', 'amount', 'total'];
      const penalties = ['ptr', 'drug license', 'rx'];

      const score = calculateConfidenceScore(normalized, required, optional, penalties);
      console.log('Template:', 'Wholesale Invoice', 'Score:', score);
      return score >= 5;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  },
  {
    id: 'general-trading',
    name: 'General Trading Invoice',
    detect(text: string): boolean {
      const normalized = normalizeText(text);

      const required = ['item', 'amount'];
      const optional = ['particulars', 'description', 'price', 'quantity', 'total', 'bill no', 'cash receipt'];
      const penalties = ['gstin', 'ptr', 'batch'];

      const score = calculateConfidenceScore(normalized, required, optional, penalties);
      console.log('Template:', 'General Trading Invoice', 'Score:', score);
      return score >= 4;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  },
  {
    id: 'unknown-fallback',
    name: 'Generic Invoice Fallback',
    detect(text: string): boolean {
      // Fallback template always matches if text is present and contains basic line item structure
      const normalized = normalizeText(text);
      if (!normalized) return false;

      const hasBasicKeywords = matchAliases(normalized, ['item', 'product', 'description', 'qty', 'amount', 'rate', 'price', 'total']);
      console.log('Template:', 'Generic Invoice Fallback', 'Hit:', hasBasicKeywords);
      return hasBasicKeywords;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  }
];