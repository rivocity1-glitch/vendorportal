export interface ParsedProduct {
  name: string | null;
  quantity: number | null;
  mrp: number | null;
  costPrice: number | null;
  sellingPrice?: number | null;
  expiry: string | null;
  batch: string | null;
  manufacturer: string | null;
  rawText: string;

  // CSV/catalog metadata
  category?: string | null;
  sourceCategory?: string | null;
  productCategory?: string | null;
  subcategory?: string | null;
  variant?: string | null;
  lowStockThreshold?: number | null;
  notes?: string | null;
  prescriptionRequired?: boolean | null;

  // Extended extracted fields
  barcode?: string | null;
  sku?: string | null;
  gstRate?: number | null;
  gstSlab?: string | null;
  gstPercent?: number | null;
  hsnCode?: string | null;
  weight?: string | null;
  unit?: string | null;
  confidence?: number | null;
  manufacturingDate?: string | null;
  mfgDate?: string | null;
}

export interface ProductMatch {
  productId: string;
  confidence: number;
  matchType: 'Exact' | 'Fuzzy' | 'None';
}

export interface CategoryMatch {
  categoryName: string;
  confidence: number;
}

export interface ReviewItem extends ParsedProduct {
  gst: number | null;
  id: string;
  selected: boolean;
  category: string | null;
  stock: number | null;
  status: 'New' | 'Match Found' | 'Needs Review';
  productMatch: ProductMatch | null;
  categoryMatch: CategoryMatch | null;
  unit?: string | null;
  purchaseRate?: number | null;
  sellingPrice?: number | null;
  ptr?: number | null;
  pts?: number | null;
  scheme?: string | null;
  schemeDiscount?: number | null;
  netRate?: number | null;
  hsn?: string | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  invoiceRaw?: string | null;
  packSize?: string | null;
}

export interface ImportSummary {
  total: number;
  newProducts: number;
  existingProducts: number;
  needsReview: number;
}

export interface PipelineResult {
  items: ReviewItem[];
  summary: ImportSummary;
}