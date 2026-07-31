/**
 * Supported MIME types for invoice file uploads.
 */
export const SUPPORTED_MIME_TYPES: string[] = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
];

/**
 * Maximum file upload size limit (20MB in bytes).
 */
export const MAX_UPLOAD_SIZE_BYTES: number = 20 * 1024 * 1024;

/**
 * Configuration options for the Tesseract OCR engine.
 */
export const OCR_CONFIG = {
  LANGUAGE: 'eng',
  CONFIDENCE_THRESHOLD: 70, // Minimum engine confidence level required to accept text segments (0-100)
  MIN_LINE_LENGTH: 3,       // Minimum characters required for an independent line text block
  HIGH_CONFIDENCE_THRESHOLD: 85, // High confidence threshold for auto-approval
  LOW_CONFIDENCE_THRESHOLD: 50,  // Low confidence threshold triggering review
  PSM_MODE: 3,                   // Fully automatic page segmentation without OSD
  DPI: 300,                      // Ideal resolution DPI target for OCR preprocessing
} as const;

/**
 * OCR Engine Confidence Thresholds for fine-grained field evaluation.
 */
export const OCR_FIELD_CONFIDENCE = {
  EXACT: 90,
  HIGH: 75,
  MEDIUM: 60,
  LOW: 40,
} as const;

/**
 * Confidence scoring thresholds for algorithmic string matching (0.0 to 1.0).
 */
export const MATCH_THRESHOLDS = {
  EXACT: 0.95,    // Confident enough to auto-link with an existing item catalog entry
  PROBABLE: 0.75, // Reasonable likelihood of matching with minor character variance
  REVIEW: 0.50,   // Flag for strict human intervention / verification
} as const;

/**
 * System statuses representing the lifecycle state of a parsed line item.
 */
export const IMPORT_STATUS = {
  NEW: 'New',
  MATCH_FOUND: 'Match Found',
  NEEDS_REVIEW: 'Needs Review',
} as const;

/**
 * Safe fallback values applied when parser fails to extract explicit information.
 */
export const DEFAULT_IMPORT_VALUES = {
  CATEGORY: 'General',
  STOCK: 0,
  QUANTITY: 1,
} as const;

/**
 * Supported visual image file extensions.
 */
export const SUPPORTED_IMAGE_EXTENSIONS: string[] = ['.jpg', '.jpeg', '.png'];

/**
 * Supported structural document file extensions.
 */
export const SUPPORTED_DOCUMENT_EXTENSIONS: string[] = ['.pdf'];

/**
 * Combined structural text extensions allowed through basic interface filtering.
 */
export const ALL_SUPPORTED_EXTENSIONS: string[] = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_DOCUMENT_EXTENSIONS,
];

/**
 * Normalized validation keywords used to heuristically identify invoice payloads.
 */
export const ALLOWED_INVOICE_KEYWORDS: string[] = [
  'invoice',
  'tax invoice',
  'bill',
  'qty',
  'quantity',
  'amount',
  'total',
  'gst',
  'mrp',
  'batch',
  'expiry',
  'rate',
  'pcs',
  'nos',
];

/**
 * Dynamic regular expressions used for identifying key pricing and tracking items.
 */
export const PARSING_PATTERNS = {
  MRP: /(?:mrp|m\.r\.p\.?|max\s*retail\s*price)[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
  RATE: /(?:rate|cost|unit\s*price|cp)[:\s]*([0-9]+(?:\.[0-9]+)?)/i,
  QTY: /(?:qty|quantity|pcs|nos|vol)[:\s]*([0-9]+)/i,
  EXPIRY: /(?:exp|expiry|exp\s*date|best\s*before)[:\s]*([0-9]{2}[-/:][0-9]{2,4}|[a-z]{3}[-/:][0-9]{2,4})/i,
  BATCH: /(?:batch|b\.?no|lot)[:\s]*([a-z0-9\-_/]+)/i,
  MANUFACTURER: /(?:mfg|mfd|manufactured\s*by|mfr)[:\s]*([a-z0-9\s.,&]+)/i,
  BARCODE: /\b(\d{8}|\d{12,14})\b/,
  GST_RATE: /\b(0|3|5|12|18|28)\s*%/,
  GSTIN: /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/,
  HSN: /\b\d{4,8}\b/,
  SKU: /\b(?:SKU|ITEM CODE|CODE)[\s:#]*([A-Z0-9-]{4,15})\b/i,
} as const;