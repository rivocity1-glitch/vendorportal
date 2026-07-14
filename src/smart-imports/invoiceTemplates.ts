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
 * Checks if the normalized text contains any of the provided alias variations
 * and returns a boolean value.
 */
function matchAliases(normalizedText: string, aliases: string[]): boolean {
  return aliases.some(alias => normalizedText.includes(alias.toLowerCase()));
}

export const invoiceTemplates: InvoiceTemplate[] = [
  {
    id: 'wholesale-generic',
    name: 'Wholesale Generic',
    detect(text: string): boolean {
      const normalized = normalizeText(text);
      let score = 0;

      if (matchAliases(normalized, ['batch'])) score++;
      if (matchAliases(normalized, ['expiry'])) score++;
      if (matchAliases(normalized, ['rate', 'list price', 'price'])) score++;
      if (matchAliases(normalized, ['gst', 'tax', 'tax %'])) score++;
      if (matchAliases(normalized, ['amount', 'amount (₹)'])) score++;
      if (matchAliases(normalized, ['qty', 'quantity'])) score++;
      if (matchAliases(normalized, ['item', 'item description', 'product'])) score++;

      // Secondary constraint to prevent overlapping with medical layouts
      if (normalized.includes('ptr')) {
        score = 0;
      }

      console.log("Template:", "Wholesale Generic", "Score:", score);
      return score >= 4;
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
      let score = 0;

      if (matchAliases(normalized, ['hsn', 'hsn/sac'])) score++;
      if (matchAliases(normalized, ['gst', 'tax', 'tax %'])) score++;
      if (matchAliases(normalized, ['rate', 'list price', 'price'])) score++;
      if (matchAliases(normalized, ['amount', 'amount (₹)'])) score++;
      if (matchAliases(normalized, ['qty', 'quantity'])) score++;
      if (matchAliases(normalized, ['unit'])) score++;
      if (matchAliases(normalized, ['item', 'item description', 'product'])) score++;

      console.log("Template:", "Retail GST Invoice", "Score:", score);
      return score >= 4;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  },
  {
    id: 'medical-distributor',
    name: 'Medical Distributor',
    detect(text: string): boolean {
      const normalized = normalizeText(text);
      let score = 0;

      if (matchAliases(normalized, ['batch'])) score++;
      if (matchAliases(normalized, ['expiry'])) score++;
      if (matchAliases(normalized, ['mrp'])) score++;
      if (matchAliases(normalized, ['ptr'])) score++;
      if (matchAliases(normalized, ['qty', 'quantity'])) score++;
      if (matchAliases(normalized, ['item', 'item description', 'product'])) score++;

      console.log("Template:", "Medical Distributor", "Score:", score);
      return score >= 4;
    },
    parse(text: string): string[] {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
  }
];