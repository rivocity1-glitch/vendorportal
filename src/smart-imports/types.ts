export interface ParsedProduct {
  name: string | null;
  quantity: number | null;
  mrp: number | null;
  costPrice: number | null;
  expiry: string | null;
  batch: string | null;
  manufacturer: string | null;
  rawText: string;
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
  gst: null;
  id: string;
  selected: boolean;
  category: string | null;
  stock: number | null;
  status: 'New' | 'Match Found' | 'Needs Review';
  productMatch: ProductMatch | null;
  categoryMatch: CategoryMatch | null;
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